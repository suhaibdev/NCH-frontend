import React, { useEffect, useRef, useState } from 'react';
import api from '../../config/axios';
import './PayoutPage.css';
import { useNavigate } from "react-router-dom";

const PayoutPage = () => {
  
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [payouts, setPayouts] = useState([]);

  const [employeeId, setEmployeeId] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [preview, setPreview] = useState(null);

  const [advanceDeduction, setAdvanceDeduction] = useState('');
  const [otherDeduction, setOtherDeduction] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [message, setMessage] = useState('');

  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const [selectedPayouts, setSelectedPayouts] = useState([]);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const creatingRef = useRef(false);


  // Salary Slip Modal

  const [showSlip, setShowSlip] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Payroll Period

  const [periodType, setPeriodType] = useState('custom');


  // Upcoming feature

  const [bulkGenerate, setBulkGenerate] = useState(false);

    const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const today = new Date();

  const setPayrollPeriod = (type) => {

    setPeriodType(type);

    const year = today.getFullYear();
    const month = today.getMonth();

    if (type === '1-10') {

      setStartDate(
        new Date(year, month, 1)
          .toISOString()
          .split('T')[0]
      );

      setEndDate(
        new Date(year, month, 10)
          .toISOString()
          .split('T')[0]
      );

      return;
    }

    if (type === '11-20') {

      setStartDate(
        new Date(year, month, 11)
          .toISOString()
          .split('T')[0]
      );

      setEndDate(
        new Date(year, month, 20)
          .toISOString()
          .split('T')[0]
      );

      return;
    }

    if (type === '21-end') {

      const lastDay =
        new Date(year, month + 1, 0).getDate();

      setStartDate(
        new Date(year, month, 21)
          .toISOString()
          .split('T')[0]
      );

      setEndDate(
        new Date(year, month, lastDay)
          .toISOString()
          .split('T')[0]
      );

      return;
    }

    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    fetchEmployees();
    fetchPayouts();
  }, []);

  const fetchEmployees = async () => {

    try {

     const res = await api.get('/employees');

        setEmployees(
          res.data.filter(emp => emp.isActive)
        );

      } catch (err) {

        console.error(err);

      }

    };

  const fetchPayouts = async () => {

        try {

          const res = await api.get('/payout');

          setPayouts(res.data);

          setSelectedPayouts([]);

        }

        catch (err) {

          console.error(err);

        }

      };

      const handlePreview = async (e) => {

      e.preventDefault();

      if (isPreviewing) return;

      setMessage('');
      setPreview(null);

      if (!employeeId) {

        setMessage('Please select employee.');

        return;

      }

      if (!startDate || !endDate) {

        setMessage('Please select payroll period.');

        return;

      }

      setIsPreviewing(true);

      try {

        const res = await api.post('/payout/preview', {

          employeeId,

          startDate,

          endDate

        });

        setPreview(res.data);

        setAdvanceDeduction(0);
        setOtherDeduction(0);

      }

      catch (err) {

        setMessage(

          err.response?.data?.message ||

          'Unable to calculate payout.'

        );

      }

      finally {

        setIsPreviewing(false);

      }

    };

    const handleCreatePayout = async () => {

        if (!preview) return;

        if (creatingRef.current) return;

        creatingRef.current = true;

        setIsCreating(true);

        try {

          await api.post("/payout", {

          employeeId,

          startDate,

          endDate,

          advanceDeducted: advanceDeduction,

          deductions: otherDeduction,

          paymentMethod

        });

          setMessage('Salary payout created successfully.');

          setPreview(null);

          setEmployeeId('');

          setStartDate('');

          setEndDate('');

          setPeriodType('custom');

          setAdvanceDeduction(0);
          setOtherDeduction(0);

          setPaymentMethod('cash');

          fetchPayouts();

        }

        catch (err) {

          setMessage(

            err.response?.data?.message ||

            'Unable to create payout.'

          );

        }

        finally {

          creatingRef.current = false;

          setIsCreating(false);

        }

    };

  const handleDeletePayout = async (id) => {
    if (window.confirm('Are you sure you want to delete this payout record?')) {
      try {
        await api.delete(`/payout/${id}`);
        await fetchPayouts();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting payout.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPayouts.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedPayouts.length} selected payout(s)?`)) {
      try {
        await Promise.all(
          selectedPayouts.map(id => api.delete(`/payout/${id}`))
        );
        await fetchPayouts();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting payouts.');
      }
    }
  };

  // Filter logic extracted so we can use it for select all
  const filteredPayouts = payouts.filter(p => {
    let matchesName = true;
    let matchesDate = true;

    if (searchName) {
      matchesName = p.employee?.name?.toLowerCase().includes(searchName.toLowerCase());
    }

    if (searchDate) {
      const sDate = p.startDate ? p.startDate.split('T')[0] : '';
      const eDate = p.endDate ? p.endDate.split('T')[0] : '';
      const pDate = p.paidOn ? p.paidOn.split('T')[0] : '';
      
      matchesDate = (
        sDate === searchDate || 
        eDate === searchDate || 
        pDate === searchDate || 
        (searchDate >= sDate && searchDate <= eDate)
      );
    }

    return matchesName && matchesDate;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPayouts(filteredPayouts.map(p => p._id));
    } else {
      setSelectedPayouts([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedPayouts(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="ep-container">
      <h2 className="ep-title">Employee Payouts</h2>
      <form className="payout-form" onSubmit={handlePreview} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'stretch' }}>
        <select
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          className="ep-input"
        >
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp._id} value={emp._id}>
              {emp.name}{emp.workType ? ` (${emp.workType})` : ''}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="ep-input"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="ep-input"
        />
        <button
          type="submit"
          className="ep-btn ep-btn-primary"
          style={{ margin: 0, padding: '0 16px', display: 'flex', alignItems: 'center' }}
          disabled={isPreviewing}
        >
          {isPreviewing ? 'Previewing...' : 'Preview'}
        </button>
      </form>
      {message && <div className="payout-message">{message}</div>}
      {preview && (
        <div className="payout-preview">
          <h4>Payout Preview</h4>
          <div>Total Days Present: <b>{preview.totalDaysWorked}</b></div>
          <div>Total Hours Worked: <b>{preview.totalHoursWorked} h</b></div>
          <div>Hourly Rate: <b>₹{Number(preview.hourlyRate).toFixed(2)}</b> <small>(daily salary ÷ 8)</small></div>
          <div>Base Amount: <b>₹{Number(preview.baseSalary || 0).toFixed(2)}</b></div>
          <div>Overtime Hours: <b>{preview.overtimeHours} h</b></div>
          <div>Overtime Amount: <b>₹{Number(preview.overtimeAmount).toFixed(2)}</b></div>
          {preview.totalAdvanceTaken > 0 && (
            <div style={{ color: '#d32f2f', margin: '8px 0', padding: '8px', border: '1px solid #ffcdd2', borderRadius: '4px', backgroundColor: '#ffebee' }}>
              Advance Payments Taken: <b>₹{preview.totalAdvanceTaken}</b>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                <i>Reminder: Please add this amount to deductions if not already settled.</i>
              </div>
            </div>
          )}
          <div style={{ marginTop: 15 }}>

          <div style={{
            background: "#fff8e1",
            padding: 12,
            borderRadius: 8,
            marginBottom: 15
          }}>
            <strong>
              Total Advance Taken :
              ₹{preview.totalAdvanceTaken}
            </strong>
            <br />
            <small>
              This is only for reference. Deduct any amount manually.
            </small>
          </div>

          <label>Advance Deduction</label>

          <input
            type="number"
            className="ep-input"
            value={advanceDeduction}
            min={0}
            max={preview.remainingAdvance  || 0 }
            onChange={(e)=>
            setAdvanceDeduction(
                  e.target.value === '' ? '' : Number(e.target.value)
              )
          }
          />

          <br /><br />

          <label>Other Deduction</label>

          <input
            type="number"
            className="ep-input"
            value={otherDeduction}
            min={0}
            onChange={(e)=>
              setOtherDeduction(Number(e.target.value))
            }
          />

        </div>
          <div>
            Payment Method:
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="ep-input"
              style={{ width: 120 }}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>

              <option value="bank">Bank</option>

              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div style={{fontSize:18,fontWeight:'bold'}}>

            Gross Salary :
            ₹{Number(preview.grossSalary || 0).toFixed(2)}

          </div>

            <div style={{marginTop:10}}>
            Advance Deduction :
            ₹{advanceDeduction}
            </div>

            <div>
            Other Deduction :
            ₹{otherDeduction}
            </div>

            <hr />

            <div
            style={{
            fontSize:22,
            color:"green",
            fontWeight:"bold"
            }}
            >
            Net Salary :
            ₹{(
            Number(preview.grossSalary || 0)
            -
            Number(advanceDeduction || 0)
            -
            Number(otherDeduction || 0)
            ).toFixed(2)}
            </div>

            <div style={{marginTop:20}}>
            <button
            type="button"
            className="ep-btn ep-btn-primary"
            onClick={handleCreatePayout}
            disabled={isCreating}
            >
            {isCreating ? "Creating..." : "Create Payout"}
            </button>
            </div>
      

        </div>
      )}

      <h3 className="ep-title">Payout Records</h3>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search by Employee Name" 
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="ep-input"
        />
        <input 
          type="date" 
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="ep-input"
        />
        <button 
          className="ep-btn ep-btn-primary" 
          onClick={() => { setSearchName(''); setSearchDate(''); }}
          style={{ margin: 0, padding: '0 16px', display: 'flex', alignItems: 'center', height: '100%' }}
        >
          Clear Filters
        </button>
        {selectedPayouts.length > 0 && (
          <button 
            className="ep-btn ep-btn-delete" 
            onClick={handleBulkDelete}
            style={{ margin: 0, padding: '0 16px', display: 'flex', alignItems: 'center', height: '100%' }}
          >
            Delete Selected ({selectedPayouts.length})
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="ep-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={filteredPayouts.length > 0 && selectedPayouts.length === filteredPayouts.length} 
                />
              </th>
              <th>S.No</th>
              <th>Employee</th>
              <th>Period</th>
              <th>Days</th>
              <th>Hours</th>
              <th>Base</th>
              <th>Overtime</th>
              <th>Deductions</th>
              <th>Total</th>
              <th>Actions</th>
              <th>Paid On</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayouts.map((p, idx) => (
              <tr key={p._id}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedPayouts.includes(p._id)} 
                    onChange={() => handleSelect(p._id)} 
                  />
                </td>
                <td>{idx + 1}</td>
                <td>{p.employee?.name}</td>
                <td>
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : ''} -{' '}
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : ''}
                </td>
                <td>{p.totalDaysWorked}</td>
                <td>{p.totalHoursWorked ?? 0}h</td>
                <td>₹{Number(p.baseSalary || 0).toFixed(2)}</td>
                <td>
                  {p.overtimeHours}h<br />
                  ₹{p.overtimeAmount}
                </td>
                <td>₹{p.deductions}</td>
                <td>₹{Number(p.netSalary || 0).toFixed(2)}</td>
                <td style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                  <select
                    value={p.status}
                    onChange={async e => {
                      const newStatus = e.target.value;
                      try {
                        await api.patch(`/payout/${p._id}/status`, { status: newStatus });
                        await fetchPayouts();
                      } catch(err) {
                        alert(err.response?.data?.message || 'Error updating status.');
                      }
                    }}
                    className="ep-input"
                    style={{ width: '100px', padding: '4px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    className="ep-btn ep-btn-primary"
                    style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                    onClick={() =>
                        navigate("/admin/salary-slip", {
                            state: p,
                        })
                    }
                >
                    Salary Slip
                </button>


                  <button 
                    onClick={() => handleDeletePayout(p._id)}
                    className="ep-btn ep-btn-delete"
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    Delete
                  </button>
                </td>
                <td>{p.paidOn ? new Date(p.paidOn).toLocaleDateString() : ''}</td>
                <td>{p.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayoutPage;
