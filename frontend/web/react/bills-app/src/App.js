import React, { useMemo, useState } from 'react';
import './App.css';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Stack,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const STUDENT_LOAN_OPTIONS = [
  { id: 'none', label: 'None', parts: [] },
  { id: 'plan1', label: 'Plan 1', parts: [{ threshold: 24990, rate: 0.09 }] },
  { id: 'plan2', label: 'Plan 2', parts: [{ threshold: 28470, rate: 0.09 }] },
  { id: 'plan4', label: 'Plan 4', parts: [{ threshold: 31395, rate: 0.09 }] },
  { id: 'plan5', label: 'Plan 5', parts: [{ threshold: 25000, rate: 0.09 }] },
  { id: 'postgrad', label: 'Postgraduate', parts: [{ threshold: 21000, rate: 0.06 }] },
  {
    id: 'plan1_postgrad',
    label: 'Plan 1 + Postgraduate',
    parts: [
      { threshold: 24990, rate: 0.09 },
      { threshold: 21000, rate: 0.06 },
    ],
  },
  {
    id: 'plan2_postgrad',
    label: 'Plan 2 + Postgraduate',
    parts: [
      { threshold: 28470, rate: 0.09 },
      { threshold: 21000, rate: 0.06 },
    ],
  },
];

function toNumber(value) {
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function clampNonNegative(value) {
  return Math.max(0, value);
}

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some((v) => !Number.isFinite(v))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftToNextWorkingDay(date) {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function calculatePersonalAllowance(annualIncome) {
  const baseAllowance = 12570;
  if (annualIncome <= 100000) return baseAllowance;
  const tapered = baseAllowance - (annualIncome - 100000) / 2;
  return Math.max(0, tapered);
}

function calculatePAYEDetails(annualTaxableIncome) {
  const income = clampNonNegative(annualTaxableIncome);
  const allowance = calculatePersonalAllowance(income);
  const taxable = Math.max(0, income - allowance);

  const basicBand = 37700;
  const higherBand = Math.max(0, 125140 - allowance - basicBand);

  const basicTaxable = Math.min(taxable, basicBand);
  const higherTaxable = Math.min(Math.max(0, taxable - basicBand), higherBand);
  const additionalTaxable = Math.max(0, taxable - basicBand - higherBand);

  const basicTax = basicTaxable * 0.2;
  const higherTax = higherTaxable * 0.4;
  const additionalTax = additionalTaxable * 0.45;

  return {
    allowance,
    taxable,
    basicTaxable,
    higherTaxable,
    additionalTaxable,
    basicTax,
    higherTax,
    additionalTax,
    totalTax: basicTax + higherTax + additionalTax,
  };
}

function calculatePAYE(annualTaxableIncome) {
  return calculatePAYEDetails(annualTaxableIncome).totalTax;
}

function calculateNationalInsurance(annualEarnings) {
  const earnings = clampNonNegative(annualEarnings);
  const primaryThreshold = 12570;
  const upperEarningsLimit = 50270;

  const mainBand = Math.max(0, Math.min(earnings, upperEarningsLimit) - primaryThreshold);
  const upperBand = Math.max(0, earnings - upperEarningsLimit);

  return mainBand * 0.08 + upperBand * 0.02;
}

function calculateStudentLoan(annualEarnings, planId) {
  const plan = STUDENT_LOAN_OPTIONS.find((option) => option.id === planId) || STUDENT_LOAN_OPTIONS[0];
  const income = clampNonNegative(annualEarnings);
  return (plan.parts || []).reduce((sum, part) => {
    const portion = Math.max(0, income - part.threshold);
    return sum + portion * part.rate;
  }, 0);
}

function calculateSalaryBreakdown({ grossAnnual, pensionPercent, salarySacrifice, studentLoanPlan }) {
  const annualGross = clampNonNegative(toNumber(grossAnnual));
  const pensionPct = clampNonNegative(toNumber(pensionPercent));
  const pensionAnnual = annualGross * (pensionPct / 100);

  const taxableAnnual = salarySacrifice ? Math.max(0, annualGross - pensionAnnual) : annualGross;
  const payeAnnual = calculatePAYE(taxableAnnual);
  const niAnnual = calculateNationalInsurance(taxableAnnual);
  const studentLoanAnnual = calculateStudentLoan(taxableAnnual, studentLoanPlan);

  const deductionsAnnual = pensionAnnual + payeAnnual + niAnnual + studentLoanAnnual;
  const netAnnual = Math.max(0, annualGross - deductionsAnnual);

  return {
    grossAnnual: annualGross,
    taxableAnnual,
    pensionAnnual,
    payeAnnual,
    niAnnual,
    studentLoanAnnual,
    netAnnual,
    netMonthly: netAnnual / 12,
    deductionsAnnual,
  };
}

function getOccurrencesForMonth(item, year, month) {
  const msDay = 24 * 60 * 60 * 1000;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  let start = item.startDate ? new Date(item.startDate) : null;
  if (!start) start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  const occurrences = [];
  const freq = item.frequency || 'monthly';

  if (freq === 'monthly') {
    const day = start.getDate();
    let d = new Date(year, month, day);
    if (item.workingDay) d = shiftToNextWorkingDay(d);
    if (d.getMonth() === month) occurrences.push(d.getDate());
    else {
      const last = new Date(year, month + 1, 0);
      const shifted = item.workingDay ? shiftToNextWorkingDay(last) : last;
      if (shifted.getMonth() === month) occurrences.push(shifted.getDate());
    }
    return occurrences;
  }

  let intervalDays = 1;
  if (freq === 'daily') intervalDays = 1;
  else if (freq === 'weekly') intervalDays = 7;
  else if (freq === 'biweekly') intervalDays = 14;
  else if (freq === '4weeks') intervalDays = 28;
  else if (freq === 'custom') intervalDays = Number(item.customInterval) || 0;

  if (!intervalDays || intervalDays <= 0) return occurrences;

  const diffDays = Math.floor((monthStart.getTime() - start.getTime()) / msDay);
  let k = diffDays <= 0 ? 0 : Math.ceil(diffDays / intervalDays);
  let date = new Date(start.getTime() + k * intervalDays * msDay);

  while (date <= monthEnd) {
    let candidate = new Date(date);
    if (item.workingDay) candidate = shiftToNextWorkingDay(candidate);
    if (candidate >= monthStart && candidate <= monthEnd && candidate.getMonth() === month) occurrences.push(candidate.getDate());
    k += 1;
    date = new Date(start.getTime() + k * intervalDays * msDay);
    if (k > 1000) break;
  }

  return occurrences;
}

function calculateScheduledShiftPay(shift) {
  const rate = clampNonNegative(toNumber(shift.hourlyRate));
  const shiftHours = clampNonNegative(toNumber(shift.shiftHours));
  const breakHours = clampNonNegative(toNumber(shift.breakMinutes)) / 60;
  const paidHours = Math.max(0, shiftHours - breakHours);
  const basePay = paidHours * rate;

  const overtimePay = (shift.overtimeRules || []).reduce((sum, rule) => {
    const hours = clampNonNegative(toNumber(rule.hours));
    const multiplier = clampNonNegative(toNumber(rule.multiplier));
    return sum + hours * rate * multiplier;
  }, 0);

  return basePay + overtimePay;
}

function getPeriodEndDate(date, cutoffDay, payFrequency) {
  const cutoff = Math.max(1, Math.min(31, Number(cutoffDay) || 1));
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (payFrequency === 'monthly') {
    const currentMonthLastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const thisCutoff = new Date(d.getFullYear(), d.getMonth(), Math.min(cutoff, currentMonthLastDay));
    if (d <= thisCutoff) return thisCutoff;

    const nextMonthLastDay = new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate();
    return new Date(d.getFullYear(), d.getMonth() + 1, Math.min(cutoff, nextMonthLastDay));
  }

  const interval = payFrequency === 'weekly' ? 7 : payFrequency === 'biweekly' ? 14 : 28;
  let anchor = new Date(d.getFullYear(), 0, Math.min(cutoff, new Date(d.getFullYear(), 1, 0).getDate()));

  while (anchor < d) anchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + interval);
  while (anchor.getTime() - interval * 24 * 60 * 60 * 1000 >= d.getTime()) {
    anchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - interval);
  }
  return anchor;
}

function App() {
  const [page, setPage] = useState('bills');
  const [billsTab, setBillsTab] = useState('bills');
  const [incomeTab, setIncomeTab] = useState('salary');

  const [items, setItems] = useState([
    { id: 1, name: '', price: '', type: '', startDate: '', frequency: 'monthly', customInterval: '', workingDay: false },
  ]);
  const [incomes, setIncomes] = useState([
    { id: 1, name: 'Income', amount: '', startDate: '', frequency: 'monthly', customInterval: '', workingDay: false },
  ]);

  const types = ['Rent', 'Utilities', 'Groceries', 'Subscription', 'Transport', 'Other'];
  const currencies = [
    { code: 'GBP', symbol: '£' },
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
  ];
  const [currency, setCurrency] = useState('GBP');
  const symbol = (currencies.find((c) => c.code === currency) || currencies[0]).symbol;

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: '', price: '', type: '', startDate: '', frequency: 'monthly', customInterval: '', workingDay: false },
    ]);
  };

  const clearAll = () => {
    setItems([{ id: Date.now(), name: '', price: '', type: '', startDate: '', frequency: 'monthly', customInterval: '', workingDay: false }]);
    setIncomes([{ id: Date.now() + 1, name: 'Income', amount: '', startDate: '', frequency: 'monthly', customInterval: '', workingDay: false }]);
  };

  const addIncome = () => {
    setIncomes((prev) => [
      ...prev,
      { id: Date.now(), name: 'Income', amount: '', startDate: '', frequency: 'monthly', customInterval: '', workingDay: false },
    ]);
  };

  const removeIncome = (id) => setIncomes((prev) => prev.filter((it) => it.id !== id));
  const updateIncome = (id, key, value) => setIncomes((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));
  const updateItem = (id, key, value) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const billsTotal = items.reduce((sum, it) => sum + toNumber(it.price), 0);
  const incomeTotal = incomes.reduce((sum, it) => sum + toNumber(it.amount), 0);
  const net = incomeTotal - billsTotal;

  const calculatePayoff = (balance, apr, payment) => {
    const r = Number(apr) / 100 / 12;
    let bal = Number(balance);
    const pay = Number(payment);
    if (!Number.isFinite(bal) || !Number.isFinite(r) || !Number.isFinite(pay) || bal <= 0 || pay <= 0) return null;
    const monthlyInterest = bal * r;
    if (pay <= monthlyInterest) return { warning: 'Payment too low to cover interest' };
    let months = 0;
    let totalInterest = 0;
    while (bal > 0.005 && months < 1000) {
      const interest = bal * r;
      totalInterest += interest;
      bal = bal + interest - pay;
      months += 1;
    }
    return { months, totalInterest };
  };

  const computeLoanPayment = (principal, apr, months) => {
    const P = Number(principal);
    const r = Number(apr) / 100 / 12;
    const n = Number(months);
    if (!P || !n) return null;
    if (r === 0) return { monthly: P / n, totalInterest: 0 };
    const monthly = P * (r / (1 - Math.pow(1 + r, -n)));
    const totalInterest = monthly * n - P;
    return { monthly, totalInterest };
  };

  const cardSx = {
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 360,
    maxHeight: '80vh',
    overflow: 'auto',
    borderRadius: 3,
    border: '1px solid rgba(12, 74, 110, 0.15)',
    boxShadow: '0 18px 45px rgba(2, 6, 23, 0.14)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.93), rgba(244,251,255,0.88))',
    backdropFilter: 'blur(6px)',
  };

  return (
    <Box className="app-shell">
      <Box className="top-nav">
        <Container maxWidth="lg" sx={{ py: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Typography variant="h5" className="brand-title">BillsApp | Money Studio</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button className="nav-btn" variant={page === 'bills' ? 'contained' : 'outlined'} onClick={() => setPage('bills')}>Bills</Button>
              <Button className="nav-btn" variant={page === 'income' ? 'contained' : 'outlined'} onClick={() => setPage('income')}>Income Management & Projection</Button>
              <Button className="nav-btn" variant={page === 'shift' ? 'contained' : 'outlined'} onClick={() => setPage('shift')}>Shift Planner</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {page === 'bills' && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Button variant={billsTab === 'bills' ? 'contained' : 'outlined'} onClick={() => setBillsTab('bills')}>Bills</Button>
              <Button variant={billsTab === 'calendar' ? 'contained' : 'outlined'} onClick={() => setBillsTab('calendar')}>Calendar</Button>
              <Button variant={billsTab === 'credit' ? 'contained' : 'outlined'} onClick={() => setBillsTab('credit')}>Credit & Loans</Button>
            </Stack>

            {billsTab === 'bills' && (
              <Paper sx={cardSx} elevation={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                  <Typography variant="h6">Bills Manager</Typography>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Currency</InputLabel>
                    <Select value={currency} label="Currency" onChange={(e) => setCurrency(e.target.value)}>
                      {currencies.map((c) => (
                        <MenuItem key={c.code} value={c.code}>{c.code} ({c.symbol})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Income Entries</Typography>
                  <Stack spacing={1}>
                    {incomes.map((inc, idx) => (
                      <Box key={inc.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" label={`Income ${idx + 1}`} value={inc.name} onChange={(e) => updateIncome(inc.id, 'name', e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
                        <TextField size="small" type="date" value={inc.startDate || ''} onChange={(e) => updateIncome(inc.id, 'startDate', e.target.value)} sx={{ width: 170 }} InputLabelProps={{ shrink: true }} />
                        <FormControl size="small" sx={{ width: 170 }}>
                          <InputLabel>Frequency</InputLabel>
                          <Select value={inc.frequency || 'monthly'} label="Frequency" onChange={(e) => updateIncome(inc.id, 'frequency', e.target.value)}>
                            <MenuItem value="daily">Daily</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="biweekly">Every 2 weeks</MenuItem>
                            <MenuItem value="4weeks">Every 4 weeks</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="custom">Custom (days)</MenuItem>
                          </Select>
                        </FormControl>
                        {inc.frequency === 'custom' && (
                          <TextField size="small" type="number" placeholder="Days" value={inc.customInterval || ''} onChange={(e) => updateIncome(inc.id, 'customInterval', e.target.value)} sx={{ width: 110 }} />
                        )}
                        <FormControlLabel control={<Checkbox checked={!!inc.workingDay} onChange={(e) => updateIncome(inc.id, 'workingDay', e.target.checked)} />} label="Working day" />
                        <TextField size="small" label="Amount" value={inc.amount} onChange={(e) => updateIncome(inc.id, 'amount', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ width: 160 }} />
                        <IconButton color="error" onClick={() => removeIncome(inc.id)}><DeleteIcon /></IconButton>
                      </Box>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 1 }}>
                    <Button startIcon={<AddIcon />} onClick={addIncome} variant="contained">Add income</Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Bills Entries</Typography>
                  <Stack spacing={1}>
                    {items.map((it, idx) => (
                      <Box key={it.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ width: 130 }}>
                          <InputLabel>Type</InputLabel>
                          <Select value={it.type || ''} label="Type" onChange={(e) => updateItem(it.id, 'type', e.target.value)}>
                            <MenuItem value="">Type</MenuItem>
                            {types.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <TextField size="small" placeholder={`Name ${idx + 1}`} value={it.name} onChange={(e) => updateItem(it.id, 'name', e.target.value)} sx={{ flex: 1, minWidth: 170 }} />
                        <TextField size="small" type="date" value={it.startDate || ''} onChange={(e) => updateItem(it.id, 'startDate', e.target.value)} sx={{ width: 170 }} InputLabelProps={{ shrink: true }} />
                        <FormControl size="small" sx={{ width: 170 }}>
                          <InputLabel>Frequency</InputLabel>
                          <Select value={it.frequency || 'monthly'} label="Frequency" onChange={(e) => updateItem(it.id, 'frequency', e.target.value)}>
                            <MenuItem value="daily">Daily</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="biweekly">Every 2 weeks</MenuItem>
                            <MenuItem value="4weeks">Every 4 weeks</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="custom">Custom (days)</MenuItem>
                          </Select>
                        </FormControl>
                        {it.frequency === 'custom' && (
                          <TextField size="small" type="number" placeholder="Days" value={it.customInterval || ''} onChange={(e) => updateItem(it.id, 'customInterval', e.target.value)} sx={{ width: 110 }} />
                        )}
                        <FormControlLabel control={<Checkbox checked={!!it.workingDay} onChange={(e) => updateItem(it.id, 'workingDay', e.target.checked)} />} label="Working day" />
                        <TextField size="small" placeholder="0.00" value={it.price} onChange={(e) => updateItem(it.id, 'price', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ width: 150 }} />
                        <IconButton color="error" onClick={() => removeItem(it.id)}><DeleteIcon /></IconButton>
                      </Box>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 1 }}>
                    <Button startIcon={<AddIcon />} onClick={addItem} variant="contained">Add item</Button>
                    <Button onClick={clearAll} sx={{ ml: 1 }} variant="outlined">Clear all</Button>
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Stack spacing={1}>
                    <CurrencyStat label="Income total" value={incomeTotal} symbol={symbol} />
                    <CurrencyStat label="Bills total" value={billsTotal} symbol={symbol} />
                    <CurrencyStat label="Net" value={net} symbol={symbol} strong />
                  </Stack>
                </Box>
              </Paper>
            )}

            {billsTab === 'credit' && (
              <Paper sx={cardSx} elevation={0}>
                <Typography variant="h6">Credit Card Payoff</Typography>
                <CreditCalculator symbol={symbol} calculatePayoff={calculatePayoff} />
                <Box sx={{ height: 18 }} />
                <Typography variant="h6">Loan Payment (by term)</Typography>
                <LoanCalculator symbol={symbol} computeLoanPayment={computeLoanPayment} />
              </Paper>
            )}

            {billsTab === 'calendar' && (
              <Paper sx={cardSx} elevation={0}>
                <Typography variant="h6">Bills Calendar</Typography>
                <Calendar items={items} incomes={incomes} symbol={symbol} />
              </Paper>
            )}
          </>
        )}

        {page === 'income' && (
          <Paper sx={cardSx} elevation={0}>
            <Typography variant="h6">Income Management & Projection</Typography>
            <Stack direction="row" spacing={1} sx={{ my: 2, flexWrap: 'wrap' }}>
              <Button variant={incomeTab === 'salary' ? 'contained' : 'outlined'} onClick={() => setIncomeTab('salary')}>Salary Breakdown</Button>
              <Button variant={incomeTab === 'pay' ? 'contained' : 'outlined'} onClick={() => setIncomeTab('pay')}>Pay Calculator</Button>
              <Button variant={incomeTab === 'pension' ? 'contained' : 'outlined'} onClick={() => setIncomeTab('pension')}>Pension Projection</Button>
            </Stack>

            {incomeTab === 'salary' && <SalaryBreakdownCalculator symbol={symbol} />}
            {incomeTab === 'pay' && <PayCalculator symbol={symbol} />}
            {incomeTab === 'pension' && <PensionProjectionCalculator symbol={symbol} />}
          </Paper>
        )}

        {page === 'shift' && (
          <Paper sx={cardSx} elevation={0}>
            <Typography variant="h6">Shift Planner</Typography>
            <ShiftPlannerPage symbol={symbol} />
          </Paper>
        )}
      </Container>
    </Box>
  );
}

function Calendar({ items, incomes, symbol }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const dayMap = {};
  const all = [...(items || []), ...(incomes || [])];
  all.forEach((it) => {
    const occ = getOccurrencesForMonth(it, year, month);
    occ.forEach((d) => {
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push(it);
    });
  });

  const weeks = [];
  let day = 1 - firstWeekday;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      if (day > 0 && day <= daysInMonth) week.push(day);
      else week.push(null);
      day += 1;
    }
    weeks.push(week);
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Button variant="outlined" onClick={prev}>Prev</Button>
        <Typography>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Typography>
        <Button variant="outlined" onClick={next}>Next</Button>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <Box key={d} sx={{ width: '14.28%', textAlign: 'center', fontWeight: 700 }}>{d}</Box>)}
      </Stack>
      {weeks.map((week, wi) => (
        <Stack direction="row" spacing={1} key={wi} sx={{ mb: 1 }}>
          {week.map((d, i) => (
            <Paper key={i} sx={{ width: '14.28%', minHeight: 92, p: 1, borderRadius: 2 }}>
              {d && (
                <Box>
                  <Typography variant="subtitle2">{d}</Typography>
                  {(dayMap[d] || []).map((it, idx) => (
                    <Box key={idx} sx={{ fontSize: 12, mt: 0.5 }}>
                      <strong>{it.name || it.type || 'Entry'}</strong> {symbol}{Number(it.price || it.amount || 0).toFixed(2)}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      ))}
    </Box>
  );
}

function CreditCalculator({ symbol, calculatePayoff }) {
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [payment, setPayment] = useState('');
  const res = calculatePayoff(balance || 0, apr || 0, payment || 0);

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField label="Balance" value={balance} onChange={(e) => setBalance(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ minWidth: 200 }} />
        <TextField label="APR (%)" value={apr} onChange={(e) => setApr(e.target.value)} sx={{ width: 140 }} />
        <TextField label="Monthly payment" value={payment} onChange={(e) => setPayment(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ width: 190 }} />
      </Stack>
      <Box sx={{ mt: 1 }}>
        {!res && <Typography color="text.secondary">Enter positive numbers to calculate.</Typography>}
        {res && res.warning && <Typography color="error">{res.warning}</Typography>}
        {res && !res.warning && (
          <Stack spacing={0.5}>
            <Typography>Months to pay off: <strong>{res.months}</strong></Typography>
            <Typography>Total interest: <strong>{symbol}{res.totalInterest.toFixed(2)}</strong></Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function LoanCalculator({ symbol, computeLoanPayment }) {
  const [principal, setPrincipal] = useState('');
  const [apr, setApr] = useState('');
  const [months, setMonths] = useState('');
  const res = computeLoanPayment(principal || 0, apr || 0, months || 0);

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField label="Principal" value={principal} onChange={(e) => setPrincipal(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ minWidth: 200 }} />
        <TextField label="APR (%)" value={apr} onChange={(e) => setApr(e.target.value)} sx={{ width: 140 }} />
        <TextField label="Term (months)" value={months} onChange={(e) => setMonths(e.target.value)} sx={{ width: 150 }} />
      </Stack>
      <Box sx={{ mt: 1 }}>
        {!res && <Typography color="text.secondary">Enter principal and term to compute payment.</Typography>}
        {res && (
          <Stack spacing={0.5}>
            <Typography>Monthly payment: <strong>{symbol}{res.monthly.toFixed(2)}</strong></Typography>
            <Typography>Total interest: <strong>{symbol}{res.totalInterest.toFixed(2)}</strong></Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function CurrencyStat({ label, value, symbol, strong = false }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography fontWeight={strong ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={strong ? 700 : 500}>{symbol}{value.toFixed(2)}</Typography>
    </Box>
  );
}

function SalaryBreakdownCalculator({ symbol }) {
  const [grossAnnual, setGrossAnnual] = useState('42000');
  const [pensionPercent, setPensionPercent] = useState('5');
  const [privatePensionPot, setPrivatePensionPot] = useState('10000');
  const [studentLoanPlan, setStudentLoanPlan] = useState('none');
  const [salarySacrifice, setSalarySacrifice] = useState(true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const result = useMemo(() => calculateSalaryBreakdown({
    grossAnnual,
    pensionPercent,
    salarySacrifice,
    studentLoanPlan,
  }), [grossAnnual, pensionPercent, salarySacrifice, studentLoanPlan]);

  const taxDetails = useMemo(() => calculatePAYEDetails(result.taxableAnnual), [result.taxableAnnual]);
  const privatePot = clampNonNegative(toNumber(privatePensionPot));
  const totalPensionValue = privatePot + result.pensionAnnual;
  const statutoryLoss = result.payeAnnual + result.niAnnual + result.studentLoanAnnual;
  const effectiveRate = result.grossAnnual > 0 ? (result.deductionsAnnual / result.grossAnnual) * 100 : 0;

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Gross annual salary"
          value={grossAnnual}
          onChange={(e) => setGrossAnnual(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 230 }}
        />
        <TextField label="Pension contribution (%)" value={pensionPercent} onChange={(e) => setPensionPercent(e.target.value)} sx={{ width: 220 }} />
        <TextField
          label="Private pension pot"
          value={privatePensionPot}
          onChange={(e) => setPrivatePensionPot(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Student loan plan</InputLabel>
          <Select value={studentLoanPlan} label="Student loan plan" onChange={(e) => setStudentLoanPlan(e.target.value)}>
            {STUDENT_LOAN_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <FormControlLabel control={<Checkbox checked={salarySacrifice} onChange={(e) => setSalarySacrifice(e.target.checked)} />} label="Treat pension as salary sacrifice" />
        <FormControlLabel control={<Checkbox checked={showTaxBreakdown} onChange={(e) => setShowTaxBreakdown(e.target.checked)} />} label="Show tax band breakdown" />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Estimated UK PAYE + NI + Student Loan values. Actual payroll may vary by tax code, region, and employer setup.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1}>
        <CurrencyStat label="Gross annual" value={result.grossAnnual} symbol={symbol} />
        <CurrencyStat label="Taxable annual" value={result.taxableAnnual} symbol={symbol} />
        <CurrencyStat label="PAYE annual" value={result.payeAnnual} symbol={symbol} />
        <CurrencyStat label="National Insurance annual" value={result.niAnnual} symbol={symbol} />
        <CurrencyStat label="Student loan annual" value={result.studentLoanAnnual} symbol={symbol} />
        <CurrencyStat label="Potential tax/loan loss" value={statutoryLoss} symbol={symbol} />
        <CurrencyStat label="Pension annual contribution" value={result.pensionAnnual} symbol={symbol} />
        <CurrencyStat label="Private pension pot (current)" value={privatePot} symbol={symbol} />
        <CurrencyStat label="Private pot + 1yr pension" value={totalPensionValue} symbol={symbol} />
        <CurrencyStat label="Net annual" value={result.netAnnual} symbol={symbol} strong />
        <CurrencyStat label="Net monthly" value={result.netMonthly} symbol={symbol} strong />
      </Stack>

      <Typography sx={{ mt: 2 }}>
        Effective deduction rate: <strong>{effectiveRate.toFixed(1)}%</strong>
      </Typography>

      {showTaxBreakdown && (
        <Paper sx={{ mt: 2, p: 2, borderRadius: 2, background: 'rgba(14, 116, 144, 0.06)' }} elevation={0}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Tax Band Breakdown</Typography>
          <Stack spacing={0.5}>
            <CurrencyStat label="Personal allowance" value={taxDetails.allowance} symbol={symbol} />
            <CurrencyStat label="Taxable pay" value={taxDetails.taxable} symbol={symbol} />
            <CurrencyStat label="Basic band tax (20%)" value={taxDetails.basicTax} symbol={symbol} />
            <CurrencyStat label="Higher band tax (40%)" value={taxDetails.higherTax} symbol={symbol} />
            <CurrencyStat label="Additional band tax (45%)" value={taxDetails.additionalTax} symbol={symbol} />
            <CurrencyStat label="Total PAYE tax" value={taxDetails.totalTax} symbol={symbol} strong />
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

function PensionProjectionCalculator({ symbol }) {
  const [currentAge, setCurrentAge] = useState('30');
  const [retirementAge, setRetirementAge] = useState('67');
  const [currentPot, setCurrentPot] = useState('15000');
  const [employeeMonthly, setEmployeeMonthly] = useState('250');
  const [employerMonthly, setEmployerMonthly] = useState('150');
  const [annualGrowth, setAnnualGrowth] = useState('5');

  const projection = useMemo(() => {
    const ageNow = toNumber(currentAge);
    const ageRetire = toNumber(retirementAge);
    const openingPot = clampNonNegative(toNumber(currentPot));
    const monthlyEmployee = clampNonNegative(toNumber(employeeMonthly));
    const monthlyEmployer = clampNonNegative(toNumber(employerMonthly));
    const growth = toNumber(annualGrowth) / 100;
    const years = Math.max(0, ageRetire - ageNow);
    const months = Math.max(0, Math.floor(years * 12));
    const monthlyRate = growth / 12;

    let pot = openingPot;
    let contributions = 0;
    for (let i = 0; i < months; i += 1) {
      const monthlyContrib = monthlyEmployee + monthlyEmployer;
      pot = pot * (1 + monthlyRate) + monthlyContrib;
      contributions += monthlyContrib;
    }

    const growthValue = pot - openingPot - contributions;
    return {
      years,
      months,
      openingPot,
      finalPot: pot,
      contributions,
      growthValue,
      incomeRule4Annual: pot * 0.04,
    };
  }, [currentAge, retirementAge, currentPot, employeeMonthly, employerMonthly, annualGrowth]);

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
        <TextField label="Current age" value={currentAge} onChange={(e) => setCurrentAge(e.target.value)} sx={{ width: 160 }} />
        <TextField label="Retirement age" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)} sx={{ width: 180 }} />
        <TextField
          label="Current pension pot"
          value={currentPot}
          onChange={(e) => setCurrentPot(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
        <TextField
          label="Your monthly contribution"
          value={employeeMonthly}
          onChange={(e) => setEmployeeMonthly(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 240 }}
        />
        <TextField
          label="Employer monthly contribution"
          value={employerMonthly}
          onChange={(e) => setEmployerMonthly(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 260 }}
        />
        <TextField label="Annual growth (%)" value={annualGrowth} onChange={(e) => setAnnualGrowth(e.target.value)} sx={{ width: 180 }} />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1}>
        <CurrencyStat label="Opening pot" value={projection.openingPot} symbol={symbol} />
        <CurrencyStat label="Total future contributions" value={projection.contributions} symbol={symbol} />
        <CurrencyStat label="Estimated growth" value={projection.growthValue} symbol={symbol} />
        <CurrencyStat label="Projected pot at retirement" value={projection.finalPot} symbol={symbol} strong />
        <CurrencyStat label="4% rule annual income estimate" value={projection.incomeRule4Annual} symbol={symbol} />
        <CurrencyStat label="4% rule monthly income estimate" value={projection.incomeRule4Annual / 12} symbol={symbol} />
      </Stack>

      <Typography sx={{ mt: 2 }}>
        Projection period: <strong>{projection.years.toFixed(0)} years ({projection.months} months)</strong>
      </Typography>
    </Box>
  );
}

function PayCalculator({ symbol }) {
  const [hourlyRate, setHourlyRate] = useState('18');
  const [hoursPerWeek, setHoursPerWeek] = useState('37.5');
  const [weeksPerYear, setWeeksPerYear] = useState('52');
  const [studentLoanPlan, setStudentLoanPlan] = useState('none');

  const [showBreakdown, setShowBreakdown] = useState({
    daily: false,
    weekly: true,
    biweekly: false,
    monthly: true,
  });

  const [currentAnnual, setCurrentAnnual] = useState('40000');
  const [risePercent, setRisePercent] = useState('5');

  const annualGross = toNumber(hourlyRate) * toNumber(hoursPerWeek) * toNumber(weeksPerYear);
  const payEstimate = calculateSalaryBreakdown({
    grossAnnual: annualGross,
    pensionPercent: 0,
    salarySacrifice: false,
    studentLoanPlan,
  });

  const workingDays = Math.max(1, toNumber(weeksPerYear) * 5);
  const periodGross = {
    daily: annualGross / workingDays,
    weekly: annualGross / 52,
    biweekly: annualGross / 26,
    monthly: annualGross / 12,
  };
  const periodNet = {
    daily: payEstimate.netAnnual / workingDays,
    weekly: payEstimate.netAnnual / 52,
    biweekly: payEstimate.netAnnual / 26,
    monthly: payEstimate.netAnnual / 12,
  };

  const riseCurrent = clampNonNegative(toNumber(currentAnnual));
  const risePct = toNumber(risePercent);
  const riseNewAnnual = riseCurrent * (1 + risePct / 100);
  const currentNet = calculateSalaryBreakdown({ grossAnnual: riseCurrent, pensionPercent: 0, salarySacrifice: false, studentLoanPlan }).netAnnual;
  const newNet = calculateSalaryBreakdown({ grossAnnual: riseNewAnnual, pensionPercent: 0, salarySacrifice: false, studentLoanPlan }).netAnnual;

  const togglePeriod = (key) => setShowBreakdown((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle1">Pay Calculator</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <TextField
          label="Hourly rate"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 200 }}
        />
        <TextField label="Hours per week" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} sx={{ width: 180 }} />
        <TextField label="Paid weeks per year" value={weeksPerYear} onChange={(e) => setWeeksPerYear(e.target.value)} sx={{ width: 190 }} />
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>Student loan plan</InputLabel>
          <Select value={studentLoanPlan} label="Student loan plan" onChange={(e) => setStudentLoanPlan(e.target.value)}>
            {STUDENT_LOAN_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Visible breakdowns</Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
        <FormControlLabel control={<Checkbox checked={showBreakdown.daily} onChange={() => togglePeriod('daily')} />} label="Daily" />
        <FormControlLabel control={<Checkbox checked={showBreakdown.weekly} onChange={() => togglePeriod('weekly')} />} label="Weekly" />
        <FormControlLabel control={<Checkbox checked={showBreakdown.biweekly} onChange={() => togglePeriod('biweekly')} />} label="Biweekly" />
        <FormControlLabel control={<Checkbox checked={showBreakdown.monthly} onChange={() => togglePeriod('monthly')} />} label="Monthly" />
      </Stack>

      {!showBreakdown.daily && !showBreakdown.weekly && !showBreakdown.biweekly && !showBreakdown.monthly && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>Enable at least one breakdown option to view values.</Typography>
      )}

      <Stack spacing={1} sx={{ mt: 2 }}>
        <CurrencyStat label="Estimated gross annual" value={annualGross} symbol={symbol} strong />
        <CurrencyStat label="Estimated net annual" value={payEstimate.netAnnual} symbol={symbol} strong />
        {showBreakdown.daily && <CurrencyStat label="Gross daily" value={periodGross.daily} symbol={symbol} />}
        {showBreakdown.daily && <CurrencyStat label="Net daily" value={periodNet.daily} symbol={symbol} />}
        {showBreakdown.weekly && <CurrencyStat label="Gross weekly" value={periodGross.weekly} symbol={symbol} />}
        {showBreakdown.weekly && <CurrencyStat label="Net weekly" value={periodNet.weekly} symbol={symbol} />}
        {showBreakdown.biweekly && <CurrencyStat label="Gross biweekly" value={periodGross.biweekly} symbol={symbol} />}
        {showBreakdown.biweekly && <CurrencyStat label="Net biweekly" value={periodNet.biweekly} symbol={symbol} />}
        {showBreakdown.monthly && <CurrencyStat label="Gross monthly" value={periodGross.monthly} symbol={symbol} />}
        {showBreakdown.monthly && <CurrencyStat label="Net monthly" value={periodNet.monthly} symbol={symbol} />}
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1">Pay Rise Calculator</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <TextField
          label="Current annual salary"
          value={currentAnnual}
          onChange={(e) => setCurrentAnnual(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }}
          sx={{ minWidth: 240 }}
        />
        <TextField label="Pay rise (%)" value={risePercent} onChange={(e) => setRisePercent(e.target.value)} sx={{ width: 160 }} />
      </Stack>

      <Stack spacing={1} sx={{ mt: 2 }}>
        <CurrencyStat label="New annual salary" value={riseNewAnnual} symbol={symbol} strong />
        <CurrencyStat label="Gross annual increase" value={riseNewAnnual - riseCurrent} symbol={symbol} />
        <CurrencyStat label="Gross monthly increase" value={(riseNewAnnual - riseCurrent) / 12} symbol={symbol} />
        <CurrencyStat label="Estimated net annual increase" value={newNet - currentNet} symbol={symbol} />
        <CurrencyStat label="Estimated net monthly increase" value={(newNet - currentNet) / 12} symbol={symbol} strong />
      </Stack>
    </Box>
  );
}

function ShiftPlannerPage({ symbol }) {
  const [shiftFormats, setShiftFormats] = useState([
    {
      id: 1,
      name: 'Day Shift 8h',
      hourlyRate: '16',
      shiftHours: '8',
      breakMinutes: '30',
      overtimeRules: [
        { id: 11, label: 'Weekday OT', hours: '0', multiplier: '1.5' },
      ],
    },
    {
      id: 2,
      name: 'Short Shift 7h',
      hourlyRate: '16',
      shiftHours: '7',
      breakMinutes: '30',
      overtimeRules: [
        { id: 21, label: 'Weekend OT', hours: '0', multiplier: '2' },
      ],
    },
  ]);

  const [selectedFormatId, setSelectedFormatId] = useState(1);
  const [assignDate, setAssignDate] = useState('');
  const [calendarShifts, setCalendarShifts] = useState([]);

  const [quickOtRate, setQuickOtRate] = useState('16');
  const [quickOtHours, setQuickOtHours] = useState('0');
  const [quickOtMultiplier, setQuickOtMultiplier] = useState('1.5');

  const [cutoffDay, setCutoffDay] = useState('25');
  const [payFrequency, setPayFrequency] = useState('monthly');

  const addShiftFormat = () => {
    const id = Date.now();
    setShiftFormats((prev) => ([
      ...prev,
      {
        id,
        name: `Shift Format ${prev.length + 1}`,
        hourlyRate: '16',
        shiftHours: '8',
        breakMinutes: '30',
        overtimeRules: [{ id: id + 1, label: 'OT', hours: '0', multiplier: '1.5' }],
      },
    ]));
    setSelectedFormatId(id);
  };

  const updateFormat = (formatId, key, value) => {
    setShiftFormats((prev) => prev.map((f) => (f.id === formatId ? { ...f, [key]: value } : f)));
  };

  const removeFormat = (formatId) => {
    setShiftFormats((prev) => prev.filter((f) => f.id !== formatId));
    if (selectedFormatId === formatId && shiftFormats.length > 1) {
      const next = shiftFormats.find((f) => f.id !== formatId);
      if (next) setSelectedFormatId(next.id);
    }
  };

  const addOtRule = (formatId) => {
    setShiftFormats((prev) => prev.map((f) => {
      if (f.id !== formatId) return f;
      return {
        ...f,
        overtimeRules: [
          ...(f.overtimeRules || []),
          { id: Date.now(), label: 'New OT', hours: '0', multiplier: '1.5' },
        ],
      };
    }));
  };

  const updateOtRule = (formatId, ruleId, key, value) => {
    setShiftFormats((prev) => prev.map((f) => {
      if (f.id !== formatId) return f;
      return {
        ...f,
        overtimeRules: (f.overtimeRules || []).map((r) => (r.id === ruleId ? { ...r, [key]: value } : r)),
      };
    }));
  };

  const removeOtRule = (formatId, ruleId) => {
    setShiftFormats((prev) => prev.map((f) => {
      if (f.id !== formatId) return f;
      return {
        ...f,
        overtimeRules: (f.overtimeRules || []).filter((r) => r.id !== ruleId),
      };
    }));
  };

  const addShiftToCalendar = () => {
    const format = shiftFormats.find((f) => f.id === selectedFormatId);
    if (!format || !assignDate) return;
    setCalendarShifts((prev) => ([
      ...prev,
      {
        id: Date.now(),
        date: assignDate,
        name: format.name,
        hourlyRate: format.hourlyRate,
        shiftHours: format.shiftHours,
        breakMinutes: format.breakMinutes,
        overtimeRules: (format.overtimeRules || []).map((rule) => ({ ...rule })),
      },
    ]));
  };

  const removeCalendarShift = (id) => setCalendarShifts((prev) => prev.filter((s) => s.id !== id));

  const quickOtValue = clampNonNegative(toNumber(quickOtRate)) * clampNonNegative(toNumber(quickOtHours)) * clampNonNegative(toNumber(quickOtMultiplier));

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle1">1) Create Shift Formats</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Build reusable templates (7h, 8h, etc.), including multiple OT multipliers for different reasons or time bands.
      </Typography>

      <Stack spacing={1}>
        {shiftFormats.map((format) => (
          <Paper key={format.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(15, 23, 42, 0.08)' }} elevation={0}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField size="small" label="Format name" value={format.name} onChange={(e) => updateFormat(format.id, 'name', e.target.value)} sx={{ minWidth: 170 }} />
              <TextField size="small" label="Hourly rate" value={format.hourlyRate} onChange={(e) => updateFormat(format.id, 'hourlyRate', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ width: 150 }} />
              <TextField size="small" label="Shift hours" value={format.shiftHours} onChange={(e) => updateFormat(format.id, 'shiftHours', e.target.value)} sx={{ width: 130 }} />
              <TextField size="small" label="Break (min)" value={format.breakMinutes} onChange={(e) => updateFormat(format.id, 'breakMinutes', e.target.value)} sx={{ width: 130 }} />
              <Button size="small" color="error" onClick={() => removeFormat(format.id)}>Remove format</Button>
            </Stack>

            <Typography variant="body2" sx={{ mb: 0.5 }}>OT Multipliers</Typography>
            {(format.overtimeRules || []).map((rule) => (
              <Stack key={rule.id} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 0.5 }}>
                <TextField size="small" label="Reason" value={rule.label} onChange={(e) => updateOtRule(format.id, rule.id, 'label', e.target.value)} sx={{ minWidth: 180 }} />
                <TextField size="small" label="Hours" value={rule.hours} onChange={(e) => updateOtRule(format.id, rule.id, 'hours', e.target.value)} sx={{ width: 110 }} />
                <TextField size="small" label="Multiplier" value={rule.multiplier} onChange={(e) => updateOtRule(format.id, rule.id, 'multiplier', e.target.value)} sx={{ width: 130 }} />
                <Button size="small" color="error" onClick={() => removeOtRule(format.id, rule.id)}>Remove OT rule</Button>
              </Stack>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => addOtRule(format.id)}>Add OT rule</Button>
          </Paper>
        ))}
      </Stack>

      <Box sx={{ mt: 1 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={addShiftFormat}>Add shift format</Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">2) Add Format To Calendar</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Shift format</InputLabel>
          <Select value={selectedFormatId} label="Shift format" onChange={(e) => setSelectedFormatId(Number(e.target.value))}>
            {shiftFormats.map((format) => <MenuItem key={format.id} value={format.id}>{format.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 190 }} />
        <Button variant="contained" onClick={addShiftToCalendar}>Add shift to calendar</Button>
      </Stack>

      {calendarShifts.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">Scheduled shifts</Typography>
          <Stack spacing={0.5}>
            {calendarShifts.map((s) => (
              <Stack key={s.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="body2">{s.date} | {s.name} | {symbol}{calculateScheduledShiftPay(s).toFixed(2)}</Typography>
                <Button size="small" color="error" onClick={() => removeCalendarShift(s.id)}>Remove</Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">3) Quick OT Calculator</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <TextField label="OT hourly rate" value={quickOtRate} onChange={(e) => setQuickOtRate(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> }} sx={{ width: 170 }} />
        <TextField label="OT hours" value={quickOtHours} onChange={(e) => setQuickOtHours(e.target.value)} sx={{ width: 130 }} />
        <TextField label="Multiplier" value={quickOtMultiplier} onChange={(e) => setQuickOtMultiplier(e.target.value)} sx={{ width: 130 }} />
      </Stack>
      <Typography sx={{ mt: 1 }}>Quick OT estimate: <strong>{symbol}{quickOtValue.toFixed(2)}</strong></Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">4) Shift Calendar + Pay Period</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <TextField label="OT cut-off day (1-31)" value={cutoffDay} onChange={(e) => setCutoffDay(e.target.value)} sx={{ width: 190 }} />
        <FormControl sx={{ minWidth: 210 }}>
          <InputLabel>Pay frequency</InputLabel>
          <Select value={payFrequency} label="Pay frequency" onChange={(e) => setPayFrequency(e.target.value)}>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="biweekly">Biweekly</MenuItem>
            <MenuItem value="4weeks">Every 4 weeks</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <ShiftEarningsCalendar
        shifts={calendarShifts}
        symbol={symbol}
        cutoffDay={cutoffDay}
        payFrequency={payFrequency}
      />
    </Box>
  );
}

function ShiftEarningsCalendar({ shifts, symbol, cutoffDay, payFrequency }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const monthShifts = (shifts || []).filter((shift) => {
    const d = parseLocalDate(shift.date);
    return d && d.getFullYear() === year && d.getMonth() === month;
  });

  const dayMap = {};
  monthShifts.forEach((shift) => {
    const d = parseLocalDate(shift.date);
    const day = d.getDate();
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(shift);
  });

  const monthlyProjected = monthShifts.reduce((sum, shift) => sum + calculateScheduledShiftPay(shift), 0);

  const groupedByPeriod = monthShifts.reduce((acc, shift) => {
    const d = parseLocalDate(shift.date);
    const periodEnd = getPeriodEndDate(d, cutoffDay, payFrequency);
    const key = formatIsoDate(periodEnd);
    if (!acc[key]) acc[key] = 0;
    acc[key] += calculateScheduledShiftPay(shift);
    return acc;
  }, {});

  const periodRows = Object.entries(groupedByPeriod)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ key, value }));

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));

  const weeks = [];
  let day = 1 - firstWeekday;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      if (day > 0 && day <= daysInMonth) week.push(day);
      else week.push(null);
      day += 1;
    }
    weeks.push(week);
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Button variant="outlined" onClick={prev}>Prev</Button>
        <Typography>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Typography>
        <Button variant="outlined" onClick={next}>Next</Button>
      </Box>

      <CurrencyStat label="Projected pay this month" value={monthlyProjected} symbol={symbol} strong />

      <Paper sx={{ mt: 1.5, p: 1.5, borderRadius: 2, background: 'rgba(20, 184, 166, 0.08)' }} elevation={0}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Pay period summary (for displayed month)</Typography>
        {periodRows.length === 0 && <Typography variant="body2" color="text.secondary">No shifts in this month yet.</Typography>}
        {periodRows.map((row) => (
          <Box key={row.key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography variant="body2">Period ending {row.key}</Typography>
            <Typography variant="body2" fontWeight={600}>{symbol}{row.value.toFixed(2)}</Typography>
          </Box>
        ))}
      </Paper>

      <Box sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <Box key={d} sx={{ width: '14.28%', textAlign: 'center', fontWeight: 700 }}>{d}</Box>
          ))}
        </Stack>

        {weeks.map((week, wi) => (
          <Stack direction="row" spacing={1} key={wi} sx={{ mb: 1 }}>
            {week.map((d, i) => (
              <Paper key={i} sx={{ width: '14.28%', minHeight: 110, p: 1, borderRadius: 2 }}>
                {d && (
                  <Box>
                    <Typography variant="subtitle2">{d}</Typography>
                    {(dayMap[d] || []).map((shift) => (
                      <Box key={shift.id} sx={{ fontSize: 12, mt: 0.5 }}>
                        <strong>{shift.name}</strong> {symbol}{calculateScheduledShiftPay(shift).toFixed(2)}
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

export default App;
