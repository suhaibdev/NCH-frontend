import React from "react";
import { useLocation } from "react-router-dom";
import "./SalarySlip.css";

const SalarySlip = () => {
  const { state } = useLocation();

  if (!state) {
    return (
      <div className="salary-slip">
        <h2>No Salary Data Found</h2>
      </div>
    );
  }

  const {
    employee,
    status,
    startDate,
    endDate,
    totalDaysWorked,
    totalHoursWorked,
    totalAmount,
    overtimeHours,
    overtimeAmount,
    deductions,
    paymentMethod,
    paidOn,
  } = state;

  const netSalary =
    Number(totalAmount) +
    Number(overtimeAmount) -
    Number(deductions);

  return (
    <div className="salary-slip-page">

      <div className="salary-slip">

        <div className="salary-header">

          <h1>NEW CALCUTTA HANDLOOM</h1>

          <p>Salary Slip</p>

        </div>

        <table className="salary-table">

          <tbody>

            <tr>
              <td><b>Employee Name</b></td>
              <td>{employee?.name}</td>
            </tr>

            <tr>
              <td><b>Salary Period</b></td>
              <td>
                {new Date(startDate).toLocaleDateString()}
                {" - "}
                {new Date(endDate).toLocaleDateString()}
              </td>
            </tr>

            <tr>
              <td><b>Working Days</b></td>
              <td>{totalDaysWorked}</td>
            </tr>

            <tr>
              <td><b>Working Hours</b></td>
              <td>{totalHoursWorked} hrs</td>
            </tr>

            <tr>
              <td><b>Base Salary</b></td>
              <td>₹{Number(totalAmount).toFixed(2)}</td>
            </tr>

            <tr>
              <td><b>Overtime Hours</b></td>
              <td>{overtimeHours}</td>
            </tr>

            <tr>
              <td><b>Overtime Amount</b></td>
              <td>₹{Number(overtimeAmount).toFixed(2)}</td>
            </tr>

            <tr>
              <td><b>Deductions</b></td>
              <td>₹{Number(deductions).toFixed(2)}</td>
            </tr>

            <tr>

            <td><b>Status</b></td>

            <td>

            <strong
            style={{
            color:
            status === "Paid"
            ? "green"
            : "#d32f2f"
            }}
            >

            {status}

            </strong>

            </td>

            </tr>

            <tr>
              <td><b>Net Salary</b></td>
              <td>
                <strong>₹{netSalary.toFixed(2)}</strong>
              </td>
            </tr>

            <tr>

            <td><b>Payment Method</b></td>

            <td>

            {status === "Paid" ? paymentMethod : "--"}

            </td>

            </tr>

            <tr>

            <td><b>Paid On</b></td>

            <td>

            {status === "Paid" ? new Date(paidOn).toLocaleDateString() : "--"}

            </td>

            </tr>

          </tbody>

        </table>

        <div className="salary-footer">

          <div>

            ______________________

            <br />

            Employer Signature

          </div>

          <div>

            ______________________

            <br />

            Employee Signature

          </div>

        </div>

      </div>

      <button
        className="print-btn"
        onClick={() => window.print()}
      >
        Print Salary Slip
      </button>

    </div>
  );
};

export default SalarySlip;