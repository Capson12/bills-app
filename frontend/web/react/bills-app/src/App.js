import React, { useState } from 'react';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

function App() {
  const [tab, setTab] = useState('bills');
  const [items, setItems] = useState([
    { id: 1, name: '', price: '', type: '' },
  ]);
  const [incomes, setIncomes] = useState([
    { id: 1, name: 'Income', amount: '' },
  ]);
  const types = ['Rent', 'Utilities', 'Groceries', 'Subscription', 'Transport', 'Other'];
  const currencies = [
    { code: 'GBP', symbol: '£' },
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
  ];
  const [currency, setCurrency] = useState('GBP');

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now(), name: '', price: '', type: '' }]);
  };

  const clearAll = () => {
    setItems([{ id: Date.now(), name: '', price: '', type: '' }]);
    setIncomes([{ id: Date.now() + 1, name: 'Income', amount: '' }]);
  };

  const addIncome = () => {
    setIncomes(prev => [...prev, { id: Date.now(), name: 'Income', amount: '' }]);
  };

  const removeIncome = (id) => {
    setIncomes(prev => prev.filter(it => it.id !== id));
  };

  const updateIncome = (id, key, value) => {
    setIncomes(prev => prev.map(it => (it.id === id ? { ...it, [key]: value } : it)));
  };

  const updateItem = (id, key, value) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [key]: value } : it)));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const billsTotal = items.reduce((sum, it) => {
    const n = parseFloat(String(it.price).replace(/,/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const incomeTotal = incomes.reduce((sum, it) => {
    const n = parseFloat(String(it.amount).replace(/,/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const net = incomeTotal - billsTotal;

  const symbol = (currencies.find(c => c.code === currency) || currencies[0]).symbol;

  // Credit / loan calculator helpers
  const calculatePayoff = (balance, apr, payment) => {
    const r = Number(apr) / 100 / 12;
    let bal = Number(balance);
    const pay = Number(payment);
    if (!isFinite(bal) || !isFinite(r) || !isFinite(pay) || bal <= 0 || pay <= 0) return null;
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Bills</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>Quickly add items and prices — totals update live.</Typography>

      <Stack direction="row" spacing={1} sx={{ my: 2 }}>
        <Button variant={tab === 'bills' ? 'contained' : 'outlined'} onClick={() => setTab('bills')}>Bills</Button>
        <Button variant={tab === 'credit' ? 'contained' : 'outlined'} onClick={() => setTab('credit')}>Credit & Loans</Button>
      </Stack>

      {tab === 'bills' && (
        <Paper sx={{ p: 3 }} elevation={3}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Currency</InputLabel>
              <Select value={currency} label="Currency" onChange={(e) => setCurrency(e.target.value)}>
                {currencies.map(c => <MenuItem key={c.code} value={c.code}>{c.code} ({c.symbol})</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Stack spacing={1}>
              {incomes.map((inc, idx) => (
                <Box key={inc.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField size="small" label={`Income ${idx + 1}`} value={inc.name} onChange={e => updateIncome(inc.id, 'name', e.target.value)} sx={{ flex: 1 }} />
                  <TextField size="small" label="Amount" value={inc.amount} onChange={e => updateIncome(inc.id, 'amount', e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 6 }}>{symbol}</span> }} sx={{ width: 160 }} />
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
            <Stack spacing={1}>
              {items.map((it, idx) => (
                <Box key={it.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ width: 160 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={it.type || ''} label="Type" onChange={e => updateItem(it.id, 'type', e.target.value)}>
                      <MenuItem value="">Type</MenuItem>
                      {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" placeholder={`Name ${idx + 1}`} value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)} sx={{ flex: 1 }} />
                  <TextField size="small" placeholder="0.00" value={it.price} onChange={e => updateItem(it.id, 'price', e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 6 }}>{symbol}</span> }} sx={{ width: 140 }} />
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Income total</Typography><Typography variant="subtitle1">{symbol}{incomeTotal.toFixed(2)}</Typography></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Bills total</Typography><Typography variant="subtitle1">{symbol}{billsTotal.toFixed(2)}</Typography></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography fontWeight={700}>Net</Typography><Typography variant="h6">{symbol}{net.toFixed(2)}</Typography></Box>
            </Stack>
          </Box>
        </Paper>
      )}

      {tab === 'credit' && (
        <Paper sx={{ p: 3 }} elevation={3}>
          <Typography variant="h6">Credit Card Payoff</Typography>
          <CreditCalculator symbol={symbol} calculatePayoff={calculatePayoff} />

          <Box sx={{height:16}} />

          <Typography variant="h6">Loan Payment (by term)</Typography>
          <LoanCalculator symbol={symbol} computeLoanPayment={computeLoanPayment} />
        </Paper>
      )}
    </Container>
  );
}

function CreditCalculator({ symbol, calculatePayoff }) {
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [payment, setPayment] = useState('');
  const res = calculatePayoff(balance || 0, apr || 0, payment || 0);

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField label="Balance" value={balance} onChange={e=>setBalance(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight:6 }}>{symbol}</span> }} />
        <TextField label="APR (%)" value={apr} onChange={e=>setApr(e.target.value)} sx={{ width: 140 }} />
        <TextField label="Monthly payment" value={payment} onChange={e=>setPayment(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight:6 }}>{symbol}</span> }} sx={{ width: 160 }} />
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
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField label="Principal" value={principal} onChange={e=>setPrincipal(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight:6 }}>{symbol}</span> }} />
        <TextField label="APR (%)" value={apr} onChange={e=>setApr(e.target.value)} sx={{ width: 140 }} />
        <TextField label="Term (months)" value={months} onChange={e=>setMonths(e.target.value)} sx={{ width: 140 }} />
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

export default App;
