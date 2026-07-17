import React, { useEffect, useState } from "react";
import api from "../../config/axios";
import "./SalaryRegister.css";

const SalaryRegister = () => {

  const [employees, setEmployees] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data.filter(emp => emp.isActive));
    } catch (err) {
      console.error(err);
    }
  };

  const generateRegister = async () => {

    if (!startDate || !endDate) {
      alert("Please select Start Date and End Date");
      return;
    }

    try {

      setLoading(true);

      const registerRows = [];

      let totalSalary = 0;
      let totalAdvance = 0;
      let totalNetSalary = 0;

      for (const emp of employees) {

        const previewRes = await api.post("/payout/preview", {
          employeeId: emp._id,
          startDate,
          endDate,
        });

        const p = previewRes.data;
                if (p.totalDaysWorked === 0) {
            continue;
        }

        registerRows.push({

          employeeId: emp._id,

          employeeName: emp.name,

          dailySalary: emp.baseDailySalary,

          workingDays: p.totalDaysWorked,

          workingHours: p.totalHoursWorked,

          overtimeHours: p.overtimeHours,

          overtimeAmount: p.overtimeAmount,

          baseSalary: p.totalAmount,

          grossSalary: p.grossAmount,

          outstandingAdvance: p.remainingAdvance,
          originalAdvance: p.remainingAdvance,

          advanceDeduct: 0,

         remainingAdvance: p.remainingAdvance, 

          otherDeduction: 0,

          netSalary: p.grossAmount,

        });

        totalSalary += p.grossAmount;
        totalAdvance += p.remainingAdvance;
        totalNetSalary += p.grossAmount;

      }

      setRows(registerRows);
      setSaved(false);

      setSummary({
        totalEmployees: registerRows.length,
        totalSalary,
        totalAdvance,
        totalNetSalary,
      });

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Failed to generate salary register."
      );

    } finally {

      setLoading(false);

    }

  };
    const updateAdvanceDeduction = (index, value) => {

    const deduction = Number(value) || 0;
    const updatedRows = [...rows];
    if (deduction > updatedRows[index].originalAdvance)  {
    alert("Advance deduction cannot exceed remaining advance.");
    return;
}


    updatedRows[index].advanceDeduct = deduction;

    updatedRows[index].remainingAdvance =
        Math.max(
        0,
        updatedRows[index].originalAdvance - deduction
        );

    updatedRows[index].netSalary =
        Math.max(
        0,
        updatedRows[index].grossSalary -
        deduction -
        updatedRows[index].otherDeduction
        );

    setRows(updatedRows);

    updateSummary(updatedRows);

  };

  const updateOtherDeduction = (index, value) => {

    const deduction = Number(value) || 0;

    const updatedRows = [...rows];

    updatedRows[index].otherDeduction = deduction;

        updatedRows[index].netSalary = Math.max(
        0,
        updatedRows[index].grossSalary -
        updatedRows[index].advanceDeduct -
        updatedRows[index].otherDeduction
    );

    setRows(updatedRows);

    updateSummary(updatedRows);

  };

  const updateSummary = (list) => {

    let totalSalary = 0;
    let totalAdvance = 0;
    let totalNetSalary = 0;

    list.forEach(row => {

      totalSalary += row.grossSalary;

      totalAdvance += row.remainingAdvance;

      totalNetSalary += row.netSalary;

    });

    setSummary({

      totalEmployees: list.length,

      totalSalary,

      totalAdvance,

      totalNetSalary,

    });

  };

  const printRegister = () => {

    window.print();

  };

  const saveRegister = async () => {

    if (rows.length === 0) {
        alert("Generate salary register first.");
        return;
    }

    try {

        const confirmSave = window.confirm(
            "Save salary for all employees?"
        );

        if (!confirmSave) return;

        setLoading(true);

        for (const row of rows) {

            await api.post("/payout", {

                employeeId: row.employeeId,

                startDate,

                endDate,

                deductions: row.otherDeduction,

                advanceDeducted: row.advanceDeduct,

                paymentMethod: "cash"

            });

        }

        alert("Salary Register Saved Successfully.");
        setSaved(true);

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "Failed to save salary register."
        );

    } finally {

        setLoading(false);

    }

   };
    return (

    <div className="salary-register">

      <div className="salary-header">

        <h2>Salary Register</h2>

        {rows.length > 0 && (

            <button
            className="print-btn"
            onClick={printRegister}
            >
            Print Register
            </button>

            )}

      </div>

      <div className="salary-filter">

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <button
            onClick={generateRegister}
            disabled={loading}
            >
          {loading ? "Generating..." : "Generate Register"}
        </button>
        <button
            className="save-btn"
            onClick={saveRegister}
            disabled={rows.length === 0 || saved}
            >
            Save Salary Register
        </button>

      </div>

      {summary && (

        <div className="salary-summary">

          <div className="summary-card">

            <span>Total Employees</span>

            <strong>{summary.totalEmployees}</strong>

          </div>

          <div className="summary-card">

            <span>Gross Salary</span>

            <strong>

              ₹{summary.totalSalary.toFixed(2)}

            </strong>

          </div>

          <div className="summary-card">

            <span>Outstanding Advance</span>

            <strong>

              ₹{summary.totalAdvance.toFixed(2)}

            </strong>

          </div>

          <div className="summary-card">

            <span>Net Salary</span>

            <strong>

              ₹{summary.totalNetSalary.toFixed(2)}

            </strong>

          </div>

        </div>

      )}
      {rows.length > 0 && (

        <div className="company-header">

            <h1>NEW CALCUTTA HANDLOOM</h1>

            <h2>EMPLOYEE SALARY REGISTER</h2>

            <p>
                Salary Period : {startDate} to {endDate}
            </p>
            <p>
                Printed On:
                {new Date().toLocaleDateString("en-IN")}
            </p>

        </div>

       )}

      <div className="salary-table-wrapper">

        <table className="salary-table">

          <thead>

            <tr>

              <th>S.No</th>

              <th>Employee</th>

              <th>Daily Salary</th>

              <th>Working Days</th>

              <th>Working Hours</th>

              <th>OT Hours</th>

              <th>OT Amount</th>

              <th>Base Salary</th>

              <th>Gross Salary</th>

              <th>Outstanding Advance</th>

              <th>Advance Deduct</th>

              <th>Remaining Advance</th>

              <th>Other Deduction</th>

              <th>Net Salary</th>

            </tr>

          </thead>

          <tbody>
            {rows.map((row, index) => (

              <tr key={row.employeeId}>

                <td>{index + 1}</td>

                <td>{row.employeeName}</td>

                <td>
                  ₹{row.dailySalary}
                </td>

                <td>
                  {row.workingDays}
                </td>

                <td>
                  {row.workingHours}
                </td>

                <td>
                  {row.overtimeHours}
                </td>

                <td>
                  ₹{row.overtimeAmount.toFixed(2)}
                </td>

                <td>
                  ₹{row.baseSalary.toFixed(2)}
                </td>

                <td>
                  ₹{row.grossSalary.toFixed(2)}
                </td>

                <td>
                  ₹{row.outstandingAdvance.toFixed(2)}
                </td>

                <td>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={row.originalAdvance}
                    value={row.advanceDeduct}
                    onChange={(e) =>
                      updateAdvanceDeduction(
                        index,
                        e.target.value
                      )
                    }
                    style={{
                      width: "90px"
                    }}
                  />

                </td>

                <td>

                 <span
                    style={{
                    color:
                    row.remainingAdvance > 0
                    ? "#d32f2f"
                    : "green",
                    fontWeight: "bold"
                    }}
                    >
                    ₹{row.remainingAdvance.toFixed(2)}
                 </span> 

                </td>

                <td>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.otherDeduction}
                    onChange={(e) =>
                      updateOtherDeduction(
                        index,
                        e.target.value
                      )
                    }
                    style={{
                      width: "90px"
                    }}
                  />

                </td>

                <td>

                  <strong
                        style={{
                            color:
                                row.netSalary === 0
                                    ? "red"
                                    : "green"
                        }}
                    >
                        ₹{row.netSalary.toFixed(2)}
                    </strong>

                </td>

              </tr>

            ))}
                      </tbody>

        </table>

        <div className="signature-section">

            <div>

                Prepared By

            </div>

            <div>

                Checked By

            </div>

            <div>

                Approved By

            </div>

        </div>

      </div>

    </div>

  );

};

export default SalaryRegister;