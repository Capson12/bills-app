import React, { useState } from 'react';
import './App.css';

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
    <div className="App app-container">
      <header className="app-header">
        <h1>Bills</h1>
        <p className="subtitle">Quickly add items and prices — total updates live.</p>
      </header>

      <nav className="tabs">
        <button className={tab === 'bills' ? 'tab active' : 'tab'} onClick={() => setTab('bills')}>Bills</button>
        <button className={tab === 'credit' ? 'tab active' : 'tab'} onClick={() => setTab('credit')}>Credit & Loans</button>
      </nav>

      {tab === 'bills' && (
        <div className="card">
        <div className="header-controls">
          <label className="currency-selector">
            Currency
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </label>
        </div>

        <div className="income-section">
          <div className="income-list">
            {incomes.map((inc, idx) => (
              <div className="income-row" key={inc.id}>
                <input
                  className="income-name"
                  placeholder={`Income ${idx + 1}`}
                  value={inc.name}
                  onChange={e => updateIncome(inc.id, 'name', e.target.value)}
                />
                <div className="price-wrap">
                  <span className="currency">{symbol}</span>
                  <input
                    className="income-amount"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={inc.amount}
                    onChange={e => updateIncome(inc.id, 'amount', e.target.value)}
                  />
                </div>
                <button className="remove" onClick={() => removeIncome(inc.id)} aria-label="Remove income">×</button>
              </div>
            ))}
          </div>
          <div className="income-controls">
            <button onClick={addIncome} className="add-btn">Add income</button>
          </div>
        </div>

        <div className="divider" />

        <div className="items">
        {items.map((it, idx) => (
          <div className="item-row" key={it.id}>
            <select className="item-type" value={it.type || ''} onChange={e => updateItem(it.id, 'type', e.target.value)}>
              <option value="">Type</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              className="item-name"
              placeholder={`Name ${idx + 1}`}
              value={it.name}
              onChange={e => updateItem(it.id, 'name', e.target.value)}
            />
            <div className="price-wrap">
              <span className="currency">{symbol}</span>
              <input
                className="item-price"
                placeholder="0.00"
                inputMode="decimal"
                value={it.price}
                onChange={e => updateItem(it.id, 'price', e.target.value)}
              />
            </div>
            <button className="remove" onClick={() => removeItem(it.id)} aria-label="Remove item">×</button>
          </div>
        ))}
        </div>

        <div className="controls">
          <button onClick={addItem} className="add-btn">Add item</button>
          <button onClick={clearAll} className="clear-btn">Clear all</button>
        </div>

        <div className="summary">
          <div className="summary-row"><span>Income total</span><strong>{symbol}{incomeTotal.toFixed(2)}</strong></div>
          <div className="summary-row"><span>Bills total</span><strong>{symbol}{billsTotal.toFixed(2)}</strong></div>
          <div className="summary-row net"><span>Net</span><strong>{symbol}{net.toFixed(2)}</strong></div>
        </div>
        </div>
      )}

      {tab === 'credit' && (
        <div className="card credit-card">
          <h2>Credit Card Payoff</h2>
          <CreditCalculator symbol={symbol} calculatePayoff={calculatePayoff} />

          <div style={{height:16}} />

          <h2>Loan Payment (by term)</h2>
          <LoanCalculator symbol={symbol} computeLoanPayment={computeLoanPayment} />
        </div>
      )}
    </div>
  );
}

function CreditCalculator({ symbol, calculatePayoff }) {
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [payment, setPayment] = useState('');
  const res = calculatePayoff(balance || 0, apr || 0, payment || 0);

  return (
    <div className="calculator">
      <div className="calc-row">
        <label>Balance</label>
        <div className="price-wrap"><span className="currency">{symbol}</span><input value={balance} onChange={e=>setBalance(e.target.value)} placeholder="0.00"/></div>
      </div>
      <div className="calc-row">
        <label>APR (%)</label>
        <input value={apr} onChange={e=>setApr(e.target.value)} placeholder="e.g. 19.99" />
      </div>
      <div className="calc-row">
        <label>Monthly payment</label>
        <div className="price-wrap"><span className="currency">{symbol}</span><input value={payment} onChange={e=>setPayment(e.target.value)} placeholder="0.00"/></div>
      </div>
      <div className="calc-result">
        {!res && <div className="muted">Enter positive numbers to calculate.</div>}
        {res && res.warning && <div className="warning">{res.warning}</div>}
        {res && !res.warning && (
          <div>
            <div>Months to pay off: <strong>{res.months}</strong></div>
            <div>Total interest: <strong>{symbol}{res.totalInterest.toFixed(2)}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanCalculator({ symbol, computeLoanPayment }) {
  const [principal, setPrincipal] = useState('');
  const [apr, setApr] = useState('');
  const [months, setMonths] = useState('');
  const res = computeLoanPayment(principal || 0, apr || 0, months || 0);
  return (
    <div className="calculator">
      <div className="calc-row">
        <label>Principal</label>
        <div className="price-wrap"><span className="currency">{symbol}</span><input value={principal} onChange={e=>setPrincipal(e.target.value)} placeholder="0.00"/></div>
      </div>
      <div className="calc-row">
        <label>APR (%)</label>
        <input value={apr} onChange={e=>setApr(e.target.value)} placeholder="e.g. 5.5" />
      </div>
      <div className="calc-row">
        <label>Term (months)</label>
        <input value={months} onChange={e=>setMonths(e.target.value)} placeholder="e.g. 60" />
      </div>
      <div className="calc-result">
        {!res && <div className="muted">Enter principal and term to compute payment.</div>}
        {res && (
          <div>
            <div>Monthly payment: <strong>{symbol}{res.monthly.toFixed(2)}</strong></div>
            <div>Total interest: <strong>{symbol}{res.totalInterest.toFixed(2)}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
