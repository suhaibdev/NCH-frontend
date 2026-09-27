import React from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./SalarySlip.css";


const formatMoney = (value) =>
  Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );


const formatDate = (value) => {
  if (!value) return "--";

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN"
  );
};


const SalarySlip = () => {
  const { state } =
    useLocation();

  const navigate =
    useNavigate();


  /* =========================================
     NO PAYOUT DATA
  ========================================== */

  if (!state) {
    return (
      <div className="salary-slip-page">

        <div className="salary-slip-empty">

          <h2>
            No Salary Data Found
          </h2>

          <p>
            Please open a salary slip
            from the Payout Records page.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/payout"
              )
            }
          >
            Back to Payouts
          </button>

        </div>

      </div>
    );
  }


  /* =========================================
     PAYOUT DATA
  ========================================== */

  const {
    employee,

    salarySlipNumber,

    startDate,
    endDate,

    totalDaysWorked,
    totalHoursWorked,

    dailySalary,
    hourlyRate,

    baseSalary,
    overtimeHours,
    overtimeAmount,
    grossSalary,

    totalAmount,

    outstandingAdvanceBefore,
    advanceDeducted,
    outstandingAdvanceAfter,

    deductions,

    netSalary,

    paymentMethod,

    status,

    paidOn,

    createdAt,

    remarks,
  } = state;


  /*
   * Older payout records may not contain
   * all of the newer fields.
   *
   * These fallbacks keep old slips usable.
   */

  const finalBaseSalary =
    Number(
      baseSalary ??
        totalAmount ??
        0
    );

  const finalOvertimeAmount =
    Number(
      overtimeAmount || 0
    );

  const finalGrossSalary =
    Number(
      grossSalary ??
        totalAmount ??
        (
          finalBaseSalary +
          finalOvertimeAmount
        )
    );

  const finalAdvanceBefore =
    Number(
      outstandingAdvanceBefore ||
        0
    );

  const finalAdvanceDeducted =
    Number(
      advanceDeducted || 0
    );

  const finalAdvanceAfter =
    outstandingAdvanceAfter !==
    undefined
      ? Number(
          outstandingAdvanceAfter ||
            0
        )
      : Math.max(
          0,
          finalAdvanceBefore -
            finalAdvanceDeducted
        );

  const finalOtherDeduction =
    Number(
      deductions || 0
    );

  const finalNetSalary =
    netSalary !== undefined
      ? Number(
          netSalary || 0
        )
      : Math.max(
          0,
          finalGrossSalary -
            finalAdvanceDeducted -
            finalOtherDeduction
        );


  return (
    <div className="salary-slip-page">

      {/* =====================================
          SCREEN ACTIONS
      ====================================== */}

      <div className="salary-slip-actions">

        <button
          type="button"
          className="salary-back-btn"
          onClick={() =>
            navigate(
              "/admin/payout"
            )
          }
        >
          Back to Payouts
        </button>

        <button
          type="button"
          className="salary-print-btn"
          onClick={() =>
            window.print()
          }
        >
          Print Salary Slip
        </button>

      </div>


      {/* =====================================
          PRINTABLE SALARY SLIP
      ====================================== */}

      <div className="salary-slip-print">

        {/* HEADER */}

        <header className="salary-slip-header">

          <div className="salary-company-name">
            NEW CALCUTTA HANDLOOM
          </div>

          <h1>
            SALARY SLIP
          </h1>

          <p>
            Employee Salary Statement
          </p>

        </header>


        {/* =====================================
            TOP INFORMATION
        ====================================== */}

        <section className="salary-info-grid">

          <div className="salary-info-item">

            <span>
              Employee Name
            </span>

            <strong>
              {employee?.name ||
                "--"}
            </strong>

          </div>


          <div className="salary-info-item">

            <span>
              Salary Slip No.
            </span>

            <strong>
              {salarySlipNumber ||
                "--"}
            </strong>

          </div>


          <div className="salary-info-item">

            <span>
              Salary Period
            </span>

            <strong>
              {formatDate(
                startDate
              )}
              {" - "}
              {formatDate(
                endDate
              )}
            </strong>

          </div>


          <div className="salary-info-item">

            <span>
              Slip Created
            </span>

            <strong>
              {formatDate(
                createdAt
              )}
            </strong>

          </div>

        </section>


        {/* =====================================
            ATTENDANCE
        ====================================== */}

        <section className="salary-section">

          <h2>
            Attendance Details
          </h2>

          <div className="salary-stat-grid">

            <div>
              <span>
                Days Worked
              </span>

              <strong>
                {totalDaysWorked ||
                  0}
              </strong>
            </div>


            <div>
              <span>
                Hours Worked
              </span>

              <strong>
                {totalHoursWorked ||
                  0}
                {" hrs"}
              </strong>
            </div>


            <div>
              <span>
                Overtime Hours
              </span>

              <strong>
                {overtimeHours ||
                  0}
                {" hrs"}
              </strong>
            </div>


            <div>
              <span>
                Daily Salary
              </span>

              <strong>
                ₹
                {formatMoney(
                  dailySalary
                )}
              </strong>
            </div>


            <div>
              <span>
                Hourly Rate
              </span>

              <strong>
                ₹
                {formatMoney(
                  hourlyRate
                )}
              </strong>
            </div>

          </div>

        </section>


        {/* =====================================
            SALARY CALCULATION
        ====================================== */}

        <section className="salary-section">

          <h2>
            Salary Calculation
          </h2>

          <table className="salary-breakdown-table">

            <tbody>

              <tr>
                <td>
                  Base Salary
                </td>

                <td>
                  ₹
                  {formatMoney(
                    finalBaseSalary
                  )}
                </td>
              </tr>


              <tr>
                <td>
                  Overtime Amount
                </td>

                <td>
                  + ₹
                  {formatMoney(
                    finalOvertimeAmount
                  )}
                </td>
              </tr>


              <tr className="salary-gross-row">
                <td>
                  Gross Salary
                </td>

                <td>
                  ₹
                  {formatMoney(
                    finalGrossSalary
                  )}
                </td>
              </tr>

            </tbody>

          </table>

        </section>


        {/* =====================================
            ADVANCE & DEDUCTIONS
        ====================================== */}

        <section className="salary-section">

          <h2>
            Advance & Deductions
          </h2>

          <table className="salary-breakdown-table">

            <tbody>

              <tr>
                <td>
                  Outstanding Advance
                  Before Payout
                </td>

                <td>
                  ₹
                  {formatMoney(
                    finalAdvanceBefore
                  )}
                </td>
              </tr>


              <tr>
                <td>
                  Advance Deducted
                </td>

                <td className="salary-negative">
                  - ₹
                  {formatMoney(
                    finalAdvanceDeducted
                  )}
                </td>
              </tr>


              <tr>
                <td>
                  Advance Left
                </td>

                <td>
                  ₹
                  {formatMoney(
                    finalAdvanceAfter
                  )}
                </td>
              </tr>


              <tr>
                <td>
                  Other Deduction
                </td>

                <td className="salary-negative">
                  - ₹
                  {formatMoney(
                    finalOtherDeduction
                  )}
                </td>
              </tr>

            </tbody>

          </table>

        </section>


        {/* =====================================
            NET SALARY
        ====================================== */}

        <section className="salary-net-section">

          <span>
            NET SALARY
          </span>

          <strong>
            ₹
            {formatMoney(
              finalNetSalary
            )}
          </strong>

        </section>


        {/* =====================================
            PAYMENT INFORMATION
        ====================================== */}

        <section className="salary-payment-grid">

          <div>

            <span>
              Payment Status
            </span>

            <strong
              className={
                status === "Paid"
                  ? "salary-status paid"
                  : "salary-status pending"
              }
            >
              {status ||
                "Pending"}
            </strong>

          </div>


          <div>

            <span>
              Payment Method
            </span>

            <strong>
              {status ===
              "Paid"
                ? (
                    paymentMethod ||
                    "--"
                  ).toUpperCase()
                : "--"}
            </strong>

          </div>


          <div>

            <span>
              Paid On
            </span>

            <strong>
              {status ===
              "Paid"
                ? formatDate(
                    paidOn
                  )
                : "--"}
            </strong>

          </div>

        </section>


        {/* =====================================
            REMARKS
        ====================================== */}

        {remarks && (
          <section className="salary-remarks">

            <span>
              Remarks
            </span>

            <p>
              {remarks}
            </p>

          </section>
        )}


        {/* =====================================
            SIGNATURES
        ====================================== */}

        <footer className="salary-signatures">

          <div>

            <div className="salary-signature-line" />

            <span>
              Employer Signature
            </span>

          </div>


          <div>

            <div className="salary-signature-line" />

            <span>
              Employee Signature
            </span>

          </div>

        </footer>

      </div>

    </div>
  );
};


export default SalarySlip;