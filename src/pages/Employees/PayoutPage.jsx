import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import api from "../../config/axios";

import "../AdminCommon.css";
import "./PayoutPage.css";

const formatInputDate = (
  year,
  monthIndex,
  day
) => {
  const month = String(
    monthIndex + 1
  ).padStart(2, "0");

  const date = String(day).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${date}`;
};

const formatDisplayDate = (date) => {
  if (!date) return "-";

  return new Date(
    date
  ).toLocaleDateString("en-IN");
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

const PayoutPage = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] =
    useState([]);

  const [payouts, setPayouts] =
    useState([]);

  const [employeeId, setEmployeeId] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [periodType, setPeriodType] =
    useState("custom");

  const [preview, setPreview] =
    useState(null);

  const [
    advanceDeduction,
    setAdvanceDeduction,
  ] = useState("");

  const [
    otherDeduction,
    setOtherDeduction,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("cash");

  const [searchName, setSearchName] =
    useState("");

  const [searchDate, setSearchDate] =
    useState("");

  const [
    selectedPayouts,
    setSelectedPayouts,
  ] = useState([]);

  const [
    loadingEmployees,
    setLoadingEmployees,
  ] = useState(true);

  const [
    loadingPayouts,
    setLoadingPayouts,
  ] = useState(true);

  const [
    isPreviewing,
    setIsPreviewing,
  ] = useState(false);

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    isBulkDeleting,
    setIsBulkDeleting,
  ] = useState(false);

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] = useState(null);

  const [message, setMessage] =
    useState({
      type: "",
      text: "",
    });

  const creatingRef = useRef(false);

  useEffect(() => {
    fetchEmployees();
    fetchPayouts();
  }, []);

  useEffect(() => {
    setSelectedPayouts([]);
  }, [searchName, searchDate]);

  const showError = (text) => {
    setMessage({
      type: "error",
      text,
    });
  };

  const showSuccess = (text) => {
    setMessage({
      type: "success",
      text,
    });
  };

  const clearMessage = () => {
    setMessage({
      type: "",
      text: "",
    });
  };

  const invalidatePreview = () => {
    setPreview(null);
    setAdvanceDeduction("");
    setOtherDeduction("");
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const res = await api.get(
        "/employees"
      );

      const list = Array.isArray(
        res.data
      )
        ? res.data
        : [];

      setEmployees(
        list.filter(
          (employee) =>
            employee.isActive
        )
      );
    } catch (err) {
      console.error(
        "Failed to fetch employees:",
        err
      );

      showError(
        err.response?.data?.message ||
          "Unable to load employees."
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoadingPayouts(true);

      const res = await api.get(
        "/payout"
      );

      setPayouts(
        Array.isArray(res.data)
          ? res.data
          : []
      );

      setSelectedPayouts([]);
    } catch (err) {
      console.error(
        "Failed to fetch payouts:",
        err
      );

      showError(
        err.response?.data?.message ||
          "Unable to load payout records."
      );
    } finally {
      setLoadingPayouts(false);
    }
  };

  const setPayrollPeriod = (type) => {
    clearMessage();
    invalidatePreview();

    setPeriodType(type);

    if (type === "custom") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const today = new Date();

    const year =
      today.getFullYear();

    const month =
      today.getMonth();

    if (type === "1-10") {
      setStartDate(
        formatInputDate(
          year,
          month,
          1
        )
      );

      setEndDate(
        formatInputDate(
          year,
          month,
          10
        )
      );

      return;
    }

    if (type === "11-20") {
      setStartDate(
        formatInputDate(
          year,
          month,
          11
        )
      );

      setEndDate(
        formatInputDate(
          year,
          month,
          20
        )
      );

      return;
    }

    if (type === "21-end") {
      const lastDay =
        new Date(
          year,
          month + 1,
          0
        ).getDate();

      setStartDate(
        formatInputDate(
          year,
          month,
          21
        )
      );

      setEndDate(
        formatInputDate(
          year,
          month,
          lastDay
        )
      );
    }
  };

  const handleEmployeeChange = (
    event
  ) => {
    setEmployeeId(
      event.target.value
    );

    clearMessage();
    invalidatePreview();
  };

  const handleStartDateChange = (
    event
  ) => {
    setStartDate(
      event.target.value
    );

    setPeriodType("custom");

    clearMessage();
    invalidatePreview();
  };

  const handleEndDateChange = (
    event
  ) => {
    setEndDate(
      event.target.value
    );

    setPeriodType("custom");

    clearMessage();
    invalidatePreview();
  };

  const handlePreview = async (
    event
  ) => {
    event.preventDefault();

    if (isPreviewing) {
      return;
    }

    clearMessage();
    setPreview(null);

    if (!employeeId) {
      showError(
        "Please select an employee."
      );
      return;
    }

    if (
      !startDate ||
      !endDate
    ) {
      showError(
        "Please select a payroll period."
      );
      return;
    }

    if (endDate < startDate) {
      showError(
        "End date cannot be before start date."
      );
      return;
    }

    try {
      setIsPreviewing(true);

      const res = await api.post(
        "/payout/preview",
        {
          employeeId,
          startDate,
          endDate,
        }
      );

      setPreview(res.data);

      setAdvanceDeduction(0);
      setOtherDeduction(0);
    } catch (err) {
      console.error(
        "Payout preview error:",
        err
      );

      showError(
        err.response?.data?.message ||
          "Unable to calculate payout."
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const remainingAdvance = Number(
    preview?.remainingAdvance || 0
  );

  const grossSalary = Number(
    preview?.grossSalary || 0
  );

  const advanceValue = Number(
    advanceDeduction || 0
  );

  const otherValue = Number(
    otherDeduction || 0
  );

  const netSalary =
    grossSalary -
    advanceValue -
    otherValue;

  const maxOtherDeduction =
    Math.max(
      0,
      grossSalary -
        advanceValue
    );

  const handleAdvanceChange = (
    event
  ) => {
    const raw =
      event.target.value;

    if (raw === "") {
      setAdvanceDeduction("");
      return;
    }

    let value = Number(raw);

    if (
      Number.isNaN(value) ||
      value < 0
    ) {
      value = 0;
    }

    if (
      value >
      remainingAdvance
    ) {
      value =
        remainingAdvance;
    }

    setAdvanceDeduction(value);

    if (
      Number(
        otherDeduction || 0
      ) >
      grossSalary - value
    ) {
      setOtherDeduction(
        Math.max(
          0,
          grossSalary - value
        )
      );
    }

    clearMessage();
  };

  const handleOtherDeductionChange = (
    event
  ) => {
    const raw =
      event.target.value;

    if (raw === "") {
      setOtherDeduction("");
      return;
    }

    let value = Number(raw);

    if (
      Number.isNaN(value) ||
      value < 0
    ) {
      value = 0;
    }

    if (
      value >
      maxOtherDeduction
    ) {
      value =
        maxOtherDeduction;
    }

    setOtherDeduction(value);

    clearMessage();
  };

  const handleCreatePayout =
    async () => {
      if (!preview) {
        showError(
          "Please preview the payout first."
        );
        return;
      }

      if (
        creatingRef.current ||
        isCreating
      ) {
        return;
      }

      const advance =
        Number(
          advanceDeduction || 0
        );

      const deduction =
        Number(
          otherDeduction || 0
        );

      if (
        advance >
        remainingAdvance
      ) {
        showError(
          `Maximum recoverable advance is ₹${formatMoney(
            remainingAdvance
          )}`
        );

        return;
      }

      if (
        advance < 0 ||
        deduction < 0
      ) {
        showError(
          "Deductions cannot be negative."
        );

        return;
      }

      if (
        advance + deduction >
        grossSalary
      ) {
        showError(
          "Total deductions cannot be greater than gross salary."
        );

        return;
      }

      creatingRef.current = true;

      try {
        setIsCreating(true);
        clearMessage();

        await api.post(
          "/payout",
          {
            employeeId,
            startDate,
            endDate,
            advanceDeducted:
              advance,
            deductions:
              deduction,
            paymentMethod,
          }
        );

        showSuccess(
          "Salary payout created successfully."
        );

        setPreview(null);

        setEmployeeId("");

        setStartDate("");
        setEndDate("");

        setPeriodType(
          "custom"
        );

        setAdvanceDeduction(
          ""
        );

        setOtherDeduction("");

        setPaymentMethod(
          "cash"
        );

        await fetchPayouts();
      } catch (err) {
        console.error(
          "Create payout error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Unable to create payout."
        );
      } finally {
        creatingRef.current =
          false;

        setIsCreating(false);
      }
    };

  const handleDeletePayout =
    async (payout) => {
      const confirmed =
        window.confirm(
          `Delete payout for ${
            payout.employee?.name ||
            "this employee"
          }?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          payout._id
        );

        clearMessage();

        await api.delete(
          `/payout/${payout._id}`
        );

        await fetchPayouts();

        showSuccess(
          "Payout deleted successfully."
        );
      } catch (err) {
        console.error(
          "Delete payout error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Error deleting payout."
        );
      } finally {
        setDeletingId(null);
      }
    };

  const filteredPayouts =
    useMemo(() => {
      const nameQuery =
        searchName
          .trim()
          .toLowerCase();

      return payouts.filter(
        (payout) => {
          const employeeName =
            payout.employee?.name
              ?.toLowerCase() ||
            "";

          const matchesName =
            employeeName.includes(
              nameQuery
            );

          if (!searchDate) {
            return matchesName;
          }

          const payoutStart =
            payout.startDate
              ? payout.startDate.split(
                  "T"
                )[0]
              : "";

          const payoutEnd =
            payout.endDate
              ? payout.endDate.split(
                  "T"
                )[0]
              : "";

          const paidDate =
            payout.paidOn
              ? payout.paidOn.split(
                  "T"
                )[0]
              : "";

          const withinPeriod =
            payoutStart &&
            payoutEnd &&
            searchDate >=
              payoutStart &&
            searchDate <=
              payoutEnd;

          const matchesDate =
            searchDate ===
              payoutStart ||
            searchDate ===
              payoutEnd ||
            searchDate ===
              paidDate ||
            withinPeriod;

          return (
            matchesName &&
            matchesDate
          );
        }
      );
    }, [
      payouts,
      searchName,
      searchDate,
    ]);

  const allFilteredSelected =
    filteredPayouts.length > 0 &&
    filteredPayouts.every(
      (payout) =>
        selectedPayouts.includes(
          payout._id
        )
    );

  const handleSelectAll = (
    event
  ) => {
    if (event.target.checked) {
      setSelectedPayouts(
        filteredPayouts.map(
          (payout) =>
            payout._id
        )
      );
    } else {
      setSelectedPayouts([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedPayouts(
      (previous) =>
        previous.includes(id)
          ? previous.filter(
              (item) =>
                item !== id
            )
          : [
              ...previous,
              id,
            ]
    );
  };

  const handleBulkDelete =
    async () => {
      if (
        selectedPayouts.length ===
        0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete ${selectedPayouts.length} selected payout(s)?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setIsBulkDeleting(true);

        clearMessage();

        await Promise.all(
          selectedPayouts.map(
            (id) =>
              api.delete(
                `/payout/${id}`
              )
          )
        );

        await fetchPayouts();

        showSuccess(
          "Selected payouts deleted successfully."
        );
      } catch (err) {
        console.error(
          "Bulk delete error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Error deleting selected payouts."
        );
      } finally {
        setIsBulkDeleting(false);
      }
    };

  const handleStatusChange =
    async (
      payout,
      newStatus
    ) => {
      try {
        setUpdatingStatusId(
          payout._id
        );

        clearMessage();

        await api.patch(
          `/payout/${payout._id}/status`,
          {
            status: newStatus,
          }
        );

        await fetchPayouts();

        showSuccess(
          `Payout marked as ${newStatus}.`
        );
      } catch (err) {
        console.error(
          "Status update error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Error updating payout status."
        );
      } finally {
        setUpdatingStatusId(
          null
        );
      }
    };

  const clearFilters = () => {
    setSearchName("");
    setSearchDate("");
  };

  return (
    <div className="ep-container payout-page">

      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="payout-page-header">
        <div>
          <h1>
            Employee Payouts
          </h1>

          <p>
            Calculate salaries,
            recover advances and manage
            employee payout records.
          </p>
        </div>

        <div className="payout-count">
          <span>
            Payout Records
          </span>

          <strong>
            {payouts.length}
          </strong>
        </div>
      </div>

      {/* =====================================
          MESSAGE
      ====================================== */}

      {message.text && (
        <div
          className={`payout-message ${message.type}`}
        >
          {message.text}
        </div>
      )}

      {/* =====================================
          CREATE PAYOUT CARD
      ====================================== */}

      <div className="payout-card">

        <div className="payout-card-header">
          <div>
            <h2>
              Create Payout
            </h2>

            <p>
              Select an employee and
              payroll period to calculate
              salary.
            </p>
          </div>
        </div>

        {/* Payroll quick periods */}

        <div className="payout-period-section">
          <span className="payout-period-label">
            Payroll Period
          </span>

          <div className="payout-period-buttons">

            <button
              type="button"
              className={
                periodType ===
                "1-10"
                  ? "payout-period-btn active"
                  : "payout-period-btn"
              }
              onClick={() =>
                setPayrollPeriod(
                  "1-10"
                )
              }
            >
              1 - 10
            </button>

            <button
              type="button"
              className={
                periodType ===
                "11-20"
                  ? "payout-period-btn active"
                  : "payout-period-btn"
              }
              onClick={() =>
                setPayrollPeriod(
                  "11-20"
                )
              }
            >
              11 - 20
            </button>

            <button
              type="button"
              className={
                periodType ===
                "21-end"
                  ? "payout-period-btn active"
                  : "payout-period-btn"
              }
              onClick={() =>
                setPayrollPeriod(
                  "21-end"
                )
              }
            >
              21 - End
            </button>

            <button
              type="button"
              className={
                periodType ===
                "custom"
                  ? "payout-period-btn active"
                  : "payout-period-btn"
              }
              onClick={() =>
                setPayrollPeriod(
                  "custom"
                )
              }
            >
              Custom
            </button>

          </div>
        </div>

        <form
          className="payout-form"
          onSubmit={
            handlePreview
          }
        >

          <div className="payout-field">
            <label>
              Employee
              <span>*</span>
            </label>

            <select
              value={employeeId}
              onChange={
                handleEmployeeChange
              }
              className="ep-input"
              disabled={
                loadingEmployees
              }
            >
              <option value="">
                {loadingEmployees
                  ? "Loading employees..."
                  : "Select Employee"}
              </option>

              {employees.map(
                (employee) => (
                  <option
                    key={
                      employee._id
                    }
                    value={
                      employee._id
                    }
                  >
                    {employee.name}

                    {employee.workType
                      ? ` (${employee.workType})`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="payout-field">
            <label>
              Start Date
              <span>*</span>
            </label>

            <input
              type="date"
              value={startDate}
              onChange={
                handleStartDateChange
              }
              className="ep-input"
            />
          </div>

          <div className="payout-field">
            <label>
              End Date
              <span>*</span>
            </label>

            <input
              type="date"
              value={endDate}
              onChange={
                handleEndDateChange
              }
              className="ep-input"
            />
          </div>

          <div className="payout-preview-action">
            <button
              type="submit"
              className="ep-btn ep-btn-primary"
              disabled={
                isPreviewing
              }
            >
              {isPreviewing
                ? "Calculating..."
                : "Preview Payout"}
            </button>
          </div>

        </form>

      </div>

      {/* =====================================
          PAYOUT PREVIEW
      ====================================== */}

      {preview && (
        <div className="payout-card payout-preview-card">

          <div className="payout-card-header">
            <div>
              <h2>
                Payout Preview
              </h2>

              <p>
                Review salary and
                deductions before creating
                the payout.
              </p>
            </div>
          </div>

          {/* Salary statistics */}

          <div className="payout-preview-grid">

            <div className="payout-stat">
              <span>
                Days Present
              </span>

              <strong>
                {preview.totalDaysWorked ||
                  0}
              </strong>
            </div>

            <div className="payout-stat">
              <span>
                Hours Worked
              </span>

              <strong>
                {preview.totalHoursWorked ||
                  0}
                h
              </strong>
            </div>

            <div className="payout-stat">
              <span>
                Hourly Rate
              </span>

              <strong>
                ₹
                {formatMoney(
                  preview.hourlyRate
                )}
              </strong>
            </div>

            <div className="payout-stat">
              <span>
                Base Amount
              </span>

              <strong>
                ₹
                {formatMoney(
                  preview.baseSalary
                )}
              </strong>
            </div>

            <div className="payout-stat">
              <span>
                Overtime
              </span>

              <strong>
                {preview.overtimeHours ||
                  0}
                h
              </strong>
            </div>

            <div className="payout-stat">
              <span>
                Overtime Amount
              </span>

              <strong>
                ₹
                {formatMoney(
                  preview.overtimeAmount
                )}
              </strong>
            </div>

          </div>

          {/* Advance taken */}

          {Number(
            preview.totalAdvanceTaken ||
              0
          ) > 0 && (
            <div className="payout-advance-notice">
              <strong>
                Advance payments during
                this period: ₹
                {formatMoney(
                  preview.totalAdvanceTaken
                )}
              </strong>

              <span>
                Review the outstanding
                advance before creating
                this payout.
              </span>
            </div>
          )}

          {/* Deductions */}

          <div className="payout-deduction-section">

            <div
              className={
                remainingAdvance > 0
                  ? "payout-outstanding warning"
                  : "payout-outstanding clear"
              }
            >
              <span>
                Outstanding Advance
              </span>

              <strong>
                ₹
                {formatMoney(
                  remainingAdvance
                )}
              </strong>

              <small>
                {remainingAdvance > 0
                  ? "Recover any amount up to the remaining advance."
                  : "Employee has no pending advance."}
              </small>
            </div>

            <div className="payout-deduction-grid">

              <div className="payout-field">
                <label>
                  Advance Deduction
                </label>

                <input
                  type="number"
                  value={
                    advanceDeduction
                  }
                  min={0}
                  max={
                    remainingAdvance
                  }
                  step="1"
                  onChange={
                    handleAdvanceChange
                  }
                  className="ep-input ep-input-no-spinner"
                  placeholder="₹0"
                  disabled={
                    remainingAdvance <=
                    0
                  }
                />

                {remainingAdvance <=
                  0 && (
                  <small className="payout-field-note">
                    No advance available
                    to deduct.
                  </small>
                )}

                <div className="payout-deduction-buttons">

                  <button
                    type="button"
                    className="payout-small-btn"
                    onClick={() =>
                      setAdvanceDeduction(
                        0
                      )
                    }
                  >
                    No Deduction
                  </button>

                  <button
                    type="button"
                    className="payout-small-btn"
                    disabled={
                      remainingAdvance <=
                      0
                    }
                    onClick={() => {
                      const fullRecovery =
                        Math.min(
                          remainingAdvance,
                          grossSalary
                        );

                      setAdvanceDeduction(
                        fullRecovery
                      );

                      if (
                        Number(
                          otherDeduction ||
                            0
                        ) >
                        grossSalary -
                          fullRecovery
                      ) {
                        setOtherDeduction(
                          Math.max(
                            0,
                            grossSalary -
                              fullRecovery
                          )
                        );
                      }
                    }}
                  >
                    Recover Full
                  </button>

                </div>
              </div>

              <div className="payout-field">
                <label>
                  Other Deduction
                </label>

                <input
                  type="number"
                  value={
                    otherDeduction
                  }
                  min={0}
                  max={
                    maxOtherDeduction
                  }
                  step="1"
                  onChange={
                    handleOtherDeductionChange
                  }
                  className="ep-input ep-input-no-spinner"
                  placeholder="₹0"
                />

                <small className="payout-field-note">
                  Maximum: ₹
                  {formatMoney(
                    maxOtherDeduction
                  )}
                </small>
              </div>

              <div className="payout-field">
                <label>
                  Payment Method
                </label>

                <select
                  value={
                    paymentMethod
                  }
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target
                        .value
                    )
                  }
                  className="ep-input"
                >
                  <option value="cash">
                    Cash
                  </option>

                  <option value="upi">
                    UPI
                  </option>

                  <option value="bank">
                    Bank
                  </option>

                  <option value="cheque">
                    Cheque
                  </option>
                </select>
              </div>

            </div>
          </div>

          {/* Final salary */}

          <div className="payout-salary-summary">

            <div>
              <span>
                Gross Salary
              </span>

              <strong>
                ₹
                {formatMoney(
                  grossSalary
                )}
              </strong>
            </div>

            <div>
              <span>
                Advance Deduction
              </span>

              <strong className="deduction">
                - ₹
                {formatMoney(
                  advanceValue
                )}
              </strong>
            </div>

            <div>
              <span>
                Other Deduction
              </span>

              <strong className="deduction">
                - ₹
                {formatMoney(
                  otherValue
                )}
              </strong>
            </div>

            <div className="payout-net-salary">
              <span>
                Net Salary
              </span>

              <strong>
                ₹
                {formatMoney(
                  netSalary
                )}
              </strong>
            </div>

          </div>

          <div className="payout-create-action">
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={
                handleCreatePayout
              }
              disabled={
                isCreating ||
                netSalary < 0 ||
                advanceValue >
                  remainingAdvance
              }
            >
              {isCreating
                ? "Creating Payout..."
                : "Create Payout"}
            </button>
          </div>

        </div>
      )}

      {/* =====================================
          PAYOUT RECORDS
      ====================================== */}

      <div className="payout-card payout-records-card">

        <div className="payout-card-header">
          <div>
            <h2>
              Payout Records
            </h2>

            <p>
              Search, update and manage
              employee payout history.
            </p>
          </div>
        </div>

        {/* Filters */}

        <div className="payout-filters">

          <div className="payout-field">
            <label>
              Employee Name
            </label>

            <input
              type="text"
              placeholder="Search employee"
              value={searchName}
              onChange={(event) =>
                setSearchName(
                  event.target.value
                )
              }
              className="ep-input"
            />
          </div>

          <div className="payout-field">
            <label>
              Date
            </label>

            <input
              type="date"
              value={searchDate}
              onChange={(event) =>
                setSearchDate(
                  event.target.value
                )
              }
              className="ep-input"
            />
          </div>

          <button
            type="button"
            className="ep-btn ep-btn-secondary payout-filter-btn"
            onClick={
              clearFilters
            }
            disabled={
              !searchName &&
              !searchDate
            }
          >
            Clear Filters
          </button>

          {selectedPayouts.length >
            0 && (
            <button
              type="button"
              className="ep-btn ep-btn-delete payout-filter-btn"
              onClick={
                handleBulkDelete
              }
              disabled={
                isBulkDeleting
              }
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete Selected (${selectedPayouts.length})`}
            </button>
          )}

        </div>

        {loadingPayouts ? (
          <div className="payout-state">
            Loading payout records...
          </div>
        ) : filteredPayouts.length ===
          0 ? (
          <div className="payout-state">
            No payout records found.
          </div>
        ) : (
          <div className="payout-table-wrapper">

            <table className="ep-table payout-table">

              <thead>
                <tr>
                  <th className="payout-checkbox-column">
                    <input
                      type="checkbox"
                      checked={
                        allFilteredSelected
                      }
                      onChange={
                        handleSelectAll
                      }
                      aria-label="Select all payouts"
                    />
                  </th>

                  <th>S.No</th>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Days</th>
                  <th>Hours</th>
                  <th>Base</th>
                  <th>Overtime</th>
                  <th>Advance</th>
                  <th>Other Deduction</th>
                  <th>Net Salary</th>
                  <th>Status / Actions</th>
                  <th>Paid On</th>
                  <th>Method</th>
                </tr>
              </thead>

              <tbody>

                {filteredPayouts.map(
                  (
                    payout,
                    index
                  ) => (
                    <tr
                      key={
                        payout._id
                      }
                    >

                      <td className="payout-checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedPayouts.includes(
                            payout._id
                          )}
                          onChange={() =>
                            handleSelect(
                              payout._id
                            )
                          }
                          aria-label={`Select payout ${index + 1}`}
                        />
                      </td>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {payout
                            .employee
                            ?.name ||
                            "-"}
                        </strong>
                      </td>

                      <td className="payout-period-cell">
                        {formatDisplayDate(
                          payout.startDate
                        )}
                        <span>
                          to
                        </span>
                        {formatDisplayDate(
                          payout.endDate
                        )}
                      </td>

                      <td>
                        {payout.totalDaysWorked ||
                          0}
                      </td>

                      <td>
                        {payout.totalHoursWorked ??
                          0}
                        h
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          payout.baseSalary
                        )}
                      </td>

                      <td>
                        <div className="payout-overtime-cell">
                          <span>
                            {payout.overtimeHours ||
                              0}
                            h
                          </span>

                          <small>
                            ₹
                            {formatMoney(
                              payout.overtimeAmount
                            )}
                          </small>
                        </div>
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          payout.advanceDeducted
                        )}
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          payout.deductions
                        )}
                      </td>

                      <td>
                        <strong className="payout-net-value">
                          ₹
                          {formatMoney(
                            payout.netSalary
                          )}
                        </strong>
                      </td>

                      <td>
                        <div className="payout-record-actions">

                          <select
                            value={
                              payout.status ||
                              "Pending"
                            }
                            onChange={(
                              event
                            ) =>
                              handleStatusChange(
                                payout,
                                event
                                  .target
                                  .value
                              )
                            }
                            className={`payout-status-select ${
                              payout.status ===
                              "Paid"
                                ? "paid"
                                : "pending"
                            }`}
                            disabled={
                              updatingStatusId ===
                              payout._id
                            }
                          >
                            <option value="Pending">
                              Pending
                            </option>

                            <option value="Paid">
                              Paid
                            </option>
                          </select>

                          <button
                            type="button"
                            className="payout-action-btn slip"
                            onClick={() =>
                              navigate(
                                "/admin/salary-slip",
                                {
                                  state:
                                    payout,
                                }
                              )
                            }
                          >
                            Salary Slip
                          </button>

                          <button
                            type="button"
                            className="payout-action-btn delete"
                            onClick={() =>
                              handleDeletePayout(
                                payout
                              )
                            }
                            disabled={
                              deletingId ===
                              payout._id
                            }
                          >
                            {deletingId ===
                            payout._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>
                      </td>

                      <td>
                        {formatDisplayDate(
                          payout.paidOn
                        )}
                      </td>

                      <td className="payout-method">
                        {payout.paymentMethod
                          ? payout.paymentMethod.toUpperCase()
                          : "-"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
};

export default PayoutPage;