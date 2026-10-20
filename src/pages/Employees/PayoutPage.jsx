import React, { useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";

import api from "../../config/axios";

import "../AdminCommon.css";
import "./PayoutPage.css";

/* ==========================================================
   HELPERS
========================================================== */

const formatInputDate = (year, monthIndex, day) => {
  const month = String(monthIndex + 1).padStart(2, "0");

  const date = String(day).padStart(2, "0");

  return `${year}-${month}-${date}`;
};

const formatDisplayDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN");
};

const formatInputDisplayDate = (date) => {
  if (!date) return "-";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatBusinessDate = (date) => {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatPaymentMethod = (method) => {
  const labels = {
    cash: "Cash",
    upi: "UPI",
    bank: "Bank Transfer",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    mixed: "Mixed Methods",
  };

  return labels[method] || (method ? String(method) : "-");
};

const formatBulkPaymentMethod = (payout) => {
  if (payout?.paymentMethod) {
    return formatPaymentMethod(payout.paymentMethod);
  }

  const methods = [
    ...new Set(
      (payout?.employees || [])
        .map((employee) => String(employee.paymentMethod || "").trim())
        .filter(Boolean)
    ),
  ];

  if (methods.length === 0) {
    return "-";
  }

  return formatPaymentMethod(methods.length === 1 ? methods[0] : "mixed");
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatWorkingTime = (record) => {
  const totalHours = Number(record?.totalHoursWorked || 0);
  const fullWorkingDays = Number.isFinite(Number(record?.fullWorkingDays))
    ? Number(record.fullWorkingDays)
    : Math.floor(totalHours / 8);
  const remainingWorkingHours = Number.isFinite(Number(record?.remainingWorkingHours))
    ? Number(record.remainingWorkingHours)
    : Number((totalHours - fullWorkingDays * 8).toFixed(10));

  return `${fullWorkingDays}D ${remainingWorkingHours}H`;
};

const getPeriodDates = (type) => {
  const today = new Date();

  const year = today.getFullYear();

  const month = today.getMonth();

  if (type === "1-10") {
    return {
      startDate: formatInputDate(year, month, 1),

      endDate: formatInputDate(year, month, 10),
    };
  }

  if (type === "11-20") {
    return {
      startDate: formatInputDate(year, month, 11),

      endDate: formatInputDate(year, month, 20),
    };
  }

  if (type === "21-end") {
    const lastDay = new Date(year, month + 1, 0).getDate();

    return {
      startDate: formatInputDate(year, month, 21),

      endDate: formatInputDate(year, month, lastDay),
    };
  }

  return {
    startDate: "",
    endDate: "",
  };
};

/* ==========================================================
   COMPONENT
========================================================== */

const PayoutPage = () => {
  const navigate = useNavigate();

  const creatingRef = useRef(false);

  /* ========================================================
     PAGE MODE
  ======================================================== */

  const [payoutMode, setPayoutMode] = useState("bulk");

  /* ========================================================
     COMMON DATA
  ======================================================== */

  const [employees, setEmployees] = useState([]);

  const [payouts, setPayouts] = useState([]);

  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [loadingPayouts, setLoadingPayouts] = useState(true);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  /* ========================================================
     SINGLE PAYOUT STATE
  ======================================================== */

  const [employeeId, setEmployeeId] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [singlePeriodType, setSinglePeriodType] = useState("custom");

  const [preview, setPreview] = useState(null);

  const [singleResult, setSingleResult] = useState(null);

  const [advanceDeduction, setAdvanceDeduction] = useState("");

  const [otherDeduction, setOtherDeduction] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [isPreviewing, setIsPreviewing] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  /* ========================================================
     PAYOUT RECORDS STATE
  ======================================================== */

  const [searchName, setSearchName] = useState("");

  const [searchDate, setSearchDate] = useState("");

  const [selectedPayouts, setSelectedPayouts] = useState([]);

  const [deletingId, setDeletingId] = useState(null);

  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  /* ========================================================
     BULK PAYOUT STATE
  ======================================================== */

  const [bulkPeriodType, setBulkPeriodType] = useState("custom");

  const [bulkStartDate, setBulkStartDate] = useState("");

  const [bulkEndDate, setBulkEndDate] = useState("");

  const [bulkDefaultPaymentMethod, setBulkDefaultPaymentMethod] = useState("cash");

  const [bulkRows, setBulkRows] = useState([]);

  const [bulkPreviewing, setBulkPreviewing] = useState(false);

  const [bulkCreating, setBulkCreating] = useState(false);

  const [bulkResult, setBulkResult] = useState(null);

  const [bulkCreatedAt, setBulkCreatedAt] = useState(null);

  const [printPayout, setPrintPayout] = useState(null);

  const [printRequested, setPrintRequested] = useState(false);

  const [bulkHistory, setBulkHistory] = useState([]);
  const [bulkHistoryLoading, setBulkHistoryLoading] = useState(true);
  const [expandedBulkHistoryId, setExpandedBulkHistoryId] = useState(null);
  const [bulkHistoryPage, setBulkHistoryPage] = useState(1);
  const [bulkHistoryMeta, setBulkHistoryMeta] = useState({ page: 1, totalPages: 1 });
  const [singleHistory, setSingleHistory] = useState([]);
  const [singleHistoryLoading, setSingleHistoryLoading] = useState(true);
  const [expandedSingleHistoryId, setExpandedSingleHistoryId] = useState(null);
  const [singleHistoryPage, setSingleHistoryPage] = useState(1);
  const [singleHistoryMeta, setSingleHistoryMeta] = useState({ page: 1, totalPages: 1 });
  const [historyTab, setHistoryTab] = useState("bulk");
  const [deletingBulkHistoryId, setDeletingBulkHistoryId] = useState(null);
  const [deletingSingleHistoryId, setDeletingSingleHistoryId] = useState(null);

  /* ========================================================
     INITIAL LOAD
  ======================================================== */

  useEffect(() => {
    fetchEmployees();
    fetchPayouts();
    fetchBulkHistory();
    fetchSingleHistory();
  }, []);

  useEffect(() => {
    setSelectedPayouts([]);
  }, [searchName, searchDate]);

  useEffect(() => {
    if (!printRequested || !printPayout) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      window.print();
      setPrintRequested(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [printPayout, printRequested]);

  /* ========================================================
     MESSAGE HELPERS
  ======================================================== */

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

  const showWarning = (text) => {
    setMessage({
      type: "warning",
      text,
    });
  };

  const clearMessage = () => {
    setMessage({
      type: "",
      text: "",
    });
  };

  /* ========================================================
     LOAD EMPLOYEES
  ======================================================== */

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const res = await api.get("/employees");

      const list = Array.isArray(res.data) ? res.data : [];

      setEmployees(list.filter((employee) => employee.isActive));
    } catch (err) {
      console.error("Failed to fetch employees:", err);

      showError(err.response?.data?.message || "Unable to load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  };

  /* ========================================================
     LOAD PAYOUTS
  ======================================================== */

  const fetchPayouts = async () => {
    try {
      setLoadingPayouts(true);

      const res = await api.get("/payout");

      setPayouts(Array.isArray(res.data) ? res.data : []);

      setSelectedPayouts([]);
    } catch (err) {
      console.error("Failed to fetch payouts:", err);

      showError(err.response?.data?.message || "Unable to load payout records.");
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchBulkHistory = async (page = 1) => {
    try {
      setBulkHistoryLoading(true);
      const response = await api.get("/payout/bulk-history", { params: { page, limit: 20 } });
      if (page > 1 && response.data?.total > 0 && response.data?.items?.length === 0)
        return fetchBulkHistory(page - 1);
      setBulkHistory(Array.isArray(response.data?.items) ? response.data.items : []);
      setBulkHistoryPage(response.data?.page || page);
      setBulkHistoryMeta({
        page: response.data?.page || page,
        totalPages: response.data?.totalPages || 1,
      });
    } catch (err) {
      console.error("Failed to fetch bulk payout history:", err);
      showError(err.response?.data?.message || "Unable to load bulk payout history.");
    } finally {
      setBulkHistoryLoading(false);
    }
  };

  const fetchSingleHistory = async (page = 1) => {
    try {
      setSingleHistoryLoading(true);
      const response = await api.get("/payout/single-history", { params: { page, limit: 20 } });
      if (page > 1 && response.data?.total > 0 && response.data?.items?.length === 0)
        return fetchSingleHistory(page - 1);
      setSingleHistory(Array.isArray(response.data?.items) ? response.data.items : []);
      setSingleHistoryPage(response.data?.page || page);
      setSingleHistoryMeta({
        page: response.data?.page || page,
        totalPages: response.data?.totalPages || 1,
      });
    } catch (err) {
      console.error("Failed to fetch single payout history:", err);
      showError(err.response?.data?.message || "Unable to load single payout history.");
    } finally {
      setSingleHistoryLoading(false);
    }
  };

  const handleDeleteBulkHistory = async (payout) => {
    const period = `${formatBusinessDate(payout.startDate)} – ${formatBusinessDate(payout.endDate)}`;
    if (
      !window.confirm(
        `Delete Bulk Payout?\n\nDelete the bulk payout for ${period} covering ${payout.employeeCount} employees?\n\nThis permanently removes the payout and makes the affected period eligible for payout again.`
      )
    )
      return;
    try {
      setDeletingBulkHistoryId(payout._id);
      await api.delete(`/payout/bulk/${payout._id}`);
      setExpandedBulkHistoryId(null);
      await fetchBulkHistory(bulkHistoryPage);
      showSuccess("Bulk payout permanently deleted.");
    } catch (err) {
      showError(err.response?.data?.message || "Unable to delete bulk payout.");
    } finally {
      setDeletingBulkHistoryId(null);
    }
  };

  const handleDeleteSingleHistory = async (payout) => {
    const period = `${formatBusinessDate(payout.startDate)} – ${formatBusinessDate(payout.endDate)}`;
    if (
      !window.confirm(
        `Delete payout for ${payout.employee?.name || "this employee"} for ${period}?\n\nThis permanently removes the payout and makes that period eligible for payout again.`
      )
    )
      return;
    try {
      setDeletingSingleHistoryId(payout._id);
      await api.delete(`/payout/${payout._id}`);
      setExpandedSingleHistoryId(null);
      await fetchSingleHistory(singleHistoryPage);
      showSuccess("Payout permanently deleted.");
    } catch (err) {
      showError(err.response?.data?.message || "Unable to delete payout.");
    } finally {
      setDeletingSingleHistoryId(null);
    }
  };

  /* ========================================================
     MODE SWITCH
  ======================================================== */

  const changePayoutMode = (mode) => {
    clearMessage();

    setPayoutMode(mode);
  };

  /* ========================================================
     SINGLE PAYOUT PERIOD
  ======================================================== */

  const setSinglePayrollPeriod = (type) => {
    clearMessage();

    setPreview(null);

    setAdvanceDeduction("");
    setOtherDeduction("");

    setSinglePeriodType(type);

    if (type === "custom") {
      setStartDate("");
      setEndDate("");

      return;
    }

    const dates = getPeriodDates(type);

    setStartDate(dates.startDate);

    setEndDate(dates.endDate);
  };

  const invalidateSinglePreview = () => {
    setPreview(null);

    setAdvanceDeduction("");
    setOtherDeduction("");
  };

  /* ========================================================
     SINGLE PREVIEW
  ======================================================== */

  const handlePreview = async (event) => {
    event.preventDefault();

    if (isPreviewing) {
      return;
    }

    clearMessage();

    setPreview(null);

    if (!employeeId) {
      showError("Please select an employee.");

      return;
    }

    if (!startDate || !endDate) {
      showError("Please select a payroll period.");

      return;
    }

    if (endDate < startDate) {
      showError("End date cannot be before start date.");

      return;
    }

    try {
      setIsPreviewing(true);

      const res = await api.post("/payout/preview", {
        employeeId,
        startDate,
        endDate,
      });

      setPreview(res.data);

      setAdvanceDeduction(0);

      setOtherDeduction(0);
    } catch (err) {
      console.error("Payout preview error:", err);

      showError(err.response?.data?.message || "Unable to calculate payout.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const remainingAdvance = Number(preview?.remainingAdvance || 0);

  const grossSalary = Number(preview?.grossSalary || 0);

  const advanceValue = Number(advanceDeduction || 0);

  const otherValue = Number(otherDeduction || 0);

  const netSalary = grossSalary - advanceValue - otherValue;

  /* ========================================================
     SINGLE DEDUCTIONS
  ======================================================== */

  const handleAdvanceChange = (event) => {
    const raw = event.target.value;

    if (raw === "") {
      setAdvanceDeduction("");
      return;
    }

    let value = Number(raw);

    if (Number.isNaN(value) || value < 0) {
      value = 0;
    }

    value = Math.min(value, remainingAdvance);

    setAdvanceDeduction(value);

    clearMessage();
  };

  const handleOtherDeductionChange = (event) => {
    const raw = event.target.value;

    if (raw === "") {
      setOtherDeduction("");
      return;
    }

    let value = Number(raw);

    if (Number.isNaN(value) || value < 0) {
      value = 0;
    }

    setOtherDeduction(value);

    clearMessage();
  };

  /* ========================================================
     CREATE SINGLE PAYOUT
  ======================================================== */

  const handleCreatePayout = async () => {
    if (!preview) {
      showError("Please preview the payout first.");

      return;
    }

    if (creatingRef.current || isCreating) {
      return;
    }

    const advance = Number(advanceDeduction || 0);

    const deduction = Number(otherDeduction || 0);

    if (advance > remainingAdvance) {
      showError(`Maximum recoverable advance is ₹${formatMoney(remainingAdvance)}`);

      return;
    }

    creatingRef.current = true;

    try {
      setIsCreating(true);

      clearMessage();

      const res = await api.post("/payout", {
        employeeId,
        startDate,
        endDate,

        advanceDeducted: advance,

        deductions: deduction,

        paymentMethod,
      });

      setSingleResult(res.data);

      showSuccess("Salary payout created successfully.");

      setPreview(null);

      setEmployeeId("");

      setStartDate("");
      setEndDate("");

      setSinglePeriodType("custom");

      setAdvanceDeduction("");
      setOtherDeduction("");

      setPaymentMethod("cash");

      await fetchPayouts();
      await fetchBulkHistory();
      await fetchSingleHistory();
    } catch (err) {
      console.error("Create payout error:", err);

      showError(err.response?.data?.message || "Unable to create payout.");
    } finally {
      creatingRef.current = false;

      setIsCreating(false);
    }
  };

  const handleCreateAnotherSinglePayout = () => {
    clearMessage();

    setSingleResult(null);

    setPreview(null);

    setPayoutMode("single");
  };

  /* ========================================================
     BULK PAYOUT PERIOD
  ======================================================== */

  const invalidateBulkPreview = () => {
    setBulkRows([]);

    setBulkResult(null);

    setBulkCreatedAt(null);
  };

  const handleCreateAnotherBulkPayout = () => {
    clearMessage();

    setBulkResult(null);

    setBulkCreatedAt(null);

    setBulkRows([]);

    setBulkPreviewing(false);

    setBulkCreating(false);

    setPayoutMode("bulk");
  };

  const setBulkPayrollPeriod = (type) => {
    clearMessage();

    invalidateBulkPreview();

    setBulkPeriodType(type);

    if (type === "custom") {
      setBulkStartDate("");
      setBulkEndDate("");

      return;
    }

    const dates = getPeriodDates(type);

    setBulkStartDate(dates.startDate);

    setBulkEndDate(dates.endDate);
  };

  /* ========================================================
     BULK PREVIEW
  ======================================================== */

  const handleBulkPreview = async (event) => {
    event.preventDefault();

    clearMessage();

    setBulkResult(null);
    setBulkCreatedAt(null);

    if (!bulkStartDate || !bulkEndDate) {
      showError("Please select the bulk payroll period.");

      return;
    }

    if (bulkEndDate < bulkStartDate) {
      showError("End date cannot be before start date.");

      return;
    }

    try {
      setBulkPreviewing(true);

      const res = await api.post("/payout/bulk-preview", {
        startDate: bulkStartDate,

        endDate: bulkEndDate,
      });

      const rows = Array.isArray(res.data?.employees) ? res.data.employees : [];

      const preparedRows = rows.map((row) => ({
        ...row,

        selected: Boolean(row.selectedByDefault),

        advanceDeducted: 0,

        otherDeduction: 0,

        paymentMethod: bulkDefaultPaymentMethod,
      }));

      setBulkRows(preparedRows);

      if (preparedRows.length === 0) {
        showWarning("No active employees have attendance marked for this period.");
      } else {
        showSuccess(`Bulk preview generated for ${preparedRows.length} employee(s).`);
      }
    } catch (err) {
      console.error("Bulk preview error:", err);

      setBulkRows([]);

      showError(err.response?.data?.message || "Unable to generate bulk payout preview.");
    } finally {
      setBulkPreviewing(false);
    }
  };

  /* ========================================================
     BULK ROW UPDATE
  ======================================================== */

  const updateBulkRow = (employeeIdValue, updater) => {
    setBulkRows((previous) =>
      previous.map((row) => {
        if (String(row.employeeId) !== String(employeeIdValue)) {
          return row;
        }

        return typeof updater === "function"
          ? updater(row)
          : {
              ...row,
              ...updater,
            };
      })
    );
  };

  /* ========================================================
     BULK SELECTION
  ======================================================== */

  const handleBulkRowSelect = (employeeIdValue) => {
    updateBulkRow(employeeIdValue, (row) => {
      if (!row.selectable) {
        return row;
      }

      return {
        ...row,
        selected: !row.selected,
      };
    });
  };

  const selectablePayableRows = bulkRows.filter(
    (row) => row.selectable && Number(row.grossSalary || 0) > 0
  );

  const allBulkSelected =
    selectablePayableRows.length > 0 && selectablePayableRows.every((row) => row.selected);

  const handleBulkSelectAll = (event) => {
    const checked = event.target.checked;

    setBulkRows((previous) =>
      previous.map((row) => {
        /*
         * Select All automatically selects
         * payable employees only.
         *
         * ₹0 employees remain unchecked,
         * but their individual checkbox can
         * still be manually selected.
         */
        if (!row.selectable || Number(row.grossSalary || 0) <= 0) {
          return {
            ...row,
            selected: false,
          };
        }

        return {
          ...row,
          selected: checked,
        };
      })
    );
  };

  /* ========================================================
     BULK ADVANCE DEDUCTION
  ======================================================== */

  const handleBulkAdvanceChange = (employeeIdValue, raw) => {
    updateBulkRow(employeeIdValue, (row) => {
      if (!row.selectable) {
        return row;
      }

      const remaining = Number(row.remainingAdvance || 0);

      let value = raw === "" ? "" : Number(raw);

      if (value !== "" && (Number.isNaN(value) || value < 0)) {
        value = 0;
      }

      if (value !== "") {
        value = Math.min(value, remaining);
      }

      return {
        ...row,

        advanceDeducted: value,
      };
    });
  };

  const recoverFullBulkAdvance = (employeeIdValue) => {
    updateBulkRow(employeeIdValue, (row) => {
      if (!row.selectable) {
        return row;
      }

      const remaining = Number(row.remainingAdvance || 0);

      const advance = remaining;

      return {
        ...row,

        advanceDeducted: advance,
      };
    });
  };

  /* ========================================================
     BULK OTHER DEDUCTION
  ======================================================== */

  const handleBulkOtherDeductionChange = (employeeIdValue, raw) => {
    updateBulkRow(employeeIdValue, (row) => {
      if (!row.selectable) {
        return row;
      }

      let value = raw === "" ? "" : Number(raw);

      if (value !== "" && (Number.isNaN(value) || value < 0)) {
        value = 0;
      }

      return {
        ...row,

        otherDeduction: value,
      };
    });
  };

  /* ========================================================
     BULK PAYMENT METHOD
  ======================================================== */

  const handleBulkDefaultMethodChange = (event) => {
    const value = event.target.value;

    setBulkDefaultPaymentMethod(value);

    setBulkRows((previous) =>
      previous.map((row) => ({
        ...row,

        paymentMethod: row.selectable ? value : row.paymentMethod,
      }))
    );
  };

  const handleBulkMethodChange = (employeeIdValue, value) => {
    updateBulkRow(employeeIdValue, {
      paymentMethod: value,
    });
  };

  /* ========================================================
     BULK CALCULATED ROWS
  ======================================================== */

  const calculatedBulkRows = useMemo(
    () =>
      bulkRows.map((row) => {
        const gross = Number(row.grossSalary || 0);

        const advance = Number(row.advanceDeducted || 0);

        const other = Number(row.otherDeduction || 0);

        const net = gross - advance - other;

        const advanceLeft = Math.max(0, Number(row.remainingAdvance || 0) - advance);

        return {
          ...row,

          calculatedNet: net,

          calculatedAdvanceLeft: advanceLeft,
        };
      }),
    [bulkRows]
  );

  const selectedBulkRows = useMemo(
    () => calculatedBulkRows.filter((row) => row.selected && row.selectable),
    [calculatedBulkRows]
  );

  const bulkTotals = useMemo(
    () =>
      selectedBulkRows.reduce(
        (totals, row) => {
          totals.employeeCount += 1;

          totals.grossSalary += Number(row.grossSalary || 0);

          totals.advanceDeduction += Number(row.advanceDeducted || 0);

          totals.otherDeduction += Number(row.otherDeduction || 0);

          totals.netSalary += Number(row.calculatedNet || 0);

          return totals;
        },
        {
          employeeCount: 0,
          grossSalary: 0,
          advanceDeduction: 0,
          otherDeduction: 0,
          netSalary: 0,
        }
      ),
    [selectedBulkRows]
  );

  /* ========================================================
     CREATE BULK PAYOUT
  ======================================================== */

  const handleBulkCreate = async () => {
    if (bulkCreating) {
      return;
    }

    if (selectedBulkRows.length === 0) {
      showError("Please select at least one employee.");

      return;
    }

    const confirmed = window.confirm(
      `Create ${selectedBulkRows.length} payout(s)?\n\nTotal Net Payout: ₹${formatMoney(
        bulkTotals.netSalary
      )}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBulkCreating(true);

      clearMessage();

      const payload = selectedBulkRows.map((row) => ({
        employeeId: row.employeeId,

        employeeName: row.employeeName,

        advanceDeducted: Number(row.advanceDeducted || 0),

        deductions: Number(row.otherDeduction || 0),

        paymentMethod: row.paymentMethod || bulkDefaultPaymentMethod,
      }));

      const res = await api.post("/payout/bulk", {
        startDate: bulkStartDate,

        endDate: bulkEndDate,

        payrollPeriod: {
          code: bulkPeriodType,
          name: bulkPeriodType === "custom" ? "Custom" : bulkPeriodType,
        },

        payouts: payload,
      });

      const result = res.data || {};

      const created = Array.isArray(result.payout?.employees) ? result.payout.employees : [];

      const failed = Array.isArray(result.failed) ? result.failed : [];

      setBulkResult({
        ...result,
        created,
        failed: [],
      });

      setBulkCreatedAt(new Date());

      /*
       * Successful rows become locked locally
       * immediately, so the user cannot click
       * Create again for the same rows.
       */
      const createdIds = new Set(created.map((item) => String(item.employeeId)));

      setBulkRows((previous) =>
        previous.map((row) => {
          if (!createdIds.has(String(row.employeeId))) {
            return row;
          }

          return {
            ...row,

            selected: false,

            selectable: false,

            alreadyCreated: true,

            existingPayout: {
              startDate: bulkStartDate,

              endDate: bulkEndDate,

              status: "Pending",
            },
          };
        })
      );

      showSuccess(`${created.length} employee payout(s) were saved in one bulk payout record.`);

      await fetchPayouts();
      await fetchBulkHistory();
    } catch (err) {
      console.error("Bulk payout creation error:", err);

      showError(err.response?.data?.message || "Unable to create bulk payouts.");
    } finally {
      setBulkCreating(false);
    }
  };

  /* ========================================================
     PRINT SUCCESSFUL BULK PAYOUTS
  ======================================================== */

  const handlePrintBulk = (savedPayout) => {
    if (!savedPayout || !Array.isArray(savedPayout.employees)) {
      showError("The saved bulk payout is unavailable for printing.");

      return;
    }

    setPrintPayout(savedPayout);
    setPrintRequested(true);
  };

  /* ========================================================
     DELETE SINGLE PAYOUT
  ======================================================== */

  const handleDeletePayout = async (payout) => {
    const confirmed = window.confirm(
      `Delete payout for ${payout.employee?.name || "this employee"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(payout._id);

      clearMessage();

      await api.delete(`/payout/${payout._id}`);

      await fetchPayouts();

      showSuccess("Payout deleted successfully.");
    } catch (err) {
      console.error("Delete payout error:", err);

      showError(err.response?.data?.message || "Error deleting payout.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ========================================================
     PAYOUT RECORD FILTERING
  ======================================================== */

  const filteredPayouts = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();

    return payouts.filter((payout) => {
      const employeeName = payout.employee?.name?.toLowerCase() || "";

      const matchesName = employeeName.includes(nameQuery);

      if (!searchDate) {
        return matchesName;
      }

      const payoutStart = payout.startDate ? payout.startDate.split("T")[0] : "";

      const payoutEnd = payout.endDate ? payout.endDate.split("T")[0] : "";

      const paidDate = payout.paidOn ? payout.paidOn.split("T")[0] : "";

      const withinPeriod =
        payoutStart && payoutEnd && searchDate >= payoutStart && searchDate <= payoutEnd;

      const matchesDate =
        searchDate === payoutStart ||
        searchDate === payoutEnd ||
        searchDate === paidDate ||
        withinPeriod;

      return matchesName && matchesDate;
    });
  }, [payouts, searchName, searchDate]);

  /* ========================================================
     PAYOUT RECORD SELECTION
  ======================================================== */

  const allFilteredSelected =
    filteredPayouts.length > 0 &&
    filteredPayouts.every((payout) => selectedPayouts.includes(payout._id));

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedPayouts(filteredPayouts.map((payout) => payout._id));
    } else {
      setSelectedPayouts([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedPayouts((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    );
  };

  /* ========================================================
     BULK DELETE OLD RECORDS
  ======================================================== */

  const handleBulkDelete = async () => {
    if (selectedPayouts.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedPayouts.length} selected payout(s)?`);

    if (!confirmed) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      clearMessage();

      await Promise.all(selectedPayouts.map((id) => api.delete(`/payout/${id}`)));

      await fetchPayouts();

      showSuccess("Selected payouts deleted successfully.");
    } catch (err) {
      console.error("Bulk delete error:", err);

      showError(err.response?.data?.message || "Error deleting selected payouts.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /* ========================================================
     UPDATE PAYOUT STATUS
  ======================================================== */

  const handleStatusChange = async (payout, newStatus) => {
    try {
      setUpdatingStatusId(payout._id);

      clearMessage();

      await api.patch(`/payout/${payout._id}/status`, {
        status: newStatus,
      });

      await fetchPayouts();

      showSuccess(`Payout marked as ${newStatus}.`);
    } catch (err) {
      console.error("Status update error:", err);

      showError(err.response?.data?.message || "Error updating payout status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <>
      <div className="ep-container payout-page">
        {/* =====================================
            PAGE HEADER
        ====================================== */}

        <div className="payout-page-header">
          <div>
            <h1>Payout</h1>

            <p>Calculate salaries, recover advances and manage employee payouts.</p>
          </div>
        </div>

        {/* =====================================
            MESSAGE
        ====================================== */}

        {message.text && <div className={`payout-message ${message.type}`}>{message.text}</div>}

        <section className="payout-card bulk-history-card">
          <div className="payout-card-header">
            <div>
              <h2>Bulk Payout History</h2>
              <p>Saved bulk payroll operations.</p>
            </div>
          </div>
          {bulkHistoryLoading ? (
            <p className="payout-empty-state">Loading payout history...</p>
          ) : bulkHistory.length === 0 ? (
            <p className="payout-empty-state">No bulk payouts have been created yet.</p>
          ) : (
            <div className="bulk-history-list">
              {bulkHistory.map((payout) => {
                const expanded = expandedBulkHistoryId === payout._id;
                return (
                  <article key={payout._id} className="bulk-history-entry">
                    <button
                      type="button"
                      className="bulk-history-row"
                      aria-expanded={expanded}
                      onClick={() => setExpandedBulkHistoryId(expanded ? null : payout._id)}
                    >
                      <strong>
                        {formatInputDisplayDate(payout.startDate)} -{" "}
                        {formatInputDisplayDate(payout.endDate)}
                      </strong>
                      <span>Employees: {payout.employeeCount}</span>
                      <span>Total Paid: ₹{formatMoney(payout.totalNetPaid)}</span>
                      <span>Advance Cut: ₹{formatMoney(payout.totalAdvanceCut)}</span>
                      <span>Advance Left: ₹{formatMoney(payout.totalAdvanceLeft)}</span>
                      <span>Paid On: {formatDisplayDate(payout.paidOn)}</span>
                    </button>
                    <button
                      type="button"
                      className="ep-btn ep-btn-secondary bulk-history-print"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePrintBulk(payout);
                      }}
                    >
                      Print
                    </button>
                    {expanded && (
                      <div className="bulk-history-details">
                        {payout.employees?.map((line) => (
                          <div key={line.employee} className="bulk-history-line">
                            <strong>{line.employeeName}</strong>
                            <span>Days: {formatWorkingTime(line)}</span>
                            <span>Gross: ₹{formatMoney(line.grossSalary)}</span>
                            <span>Advance Left: ₹{formatMoney(line.outstandingAdvanceAfter)}</span>
                            <span>Advance Cut: ₹{formatMoney(line.advanceDeducted)}</span>
                            <strong>Net Paid: ₹{formatMoney(line.netSalary)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="payout-card payout-history-card">
          <div className="payout-card-header">
            <h2>Payout History</h2>
          </div>
          <div className="payout-history-tabs" role="tablist" aria-label="Payout history">
            <button
              type="button"
              role="tab"
              aria-selected={historyTab === "bulk"}
              className={historyTab === "bulk" ? "active" : ""}
              onClick={() => setHistoryTab("bulk")}
            >
              Bulk Payout
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={historyTab === "single"}
              className={historyTab === "single" ? "active" : ""}
              onClick={() => setHistoryTab("single")}
            >
              Single Payout
            </button>
          </div>

          {historyTab === "bulk" &&
            (bulkHistoryLoading ? (
              <p className="payout-empty-state">Loading bulk payout history...</p>
            ) : bulkHistory.length === 0 ? (
              <p className="payout-empty-state">No bulk payouts found.</p>
            ) : (
              <>
                <div className="payout-history-table-wrap">
                  <table className="payout-history-table">
                    <thead>
                      <tr>
                        <th>S.No.</th>
                        <th>Period</th>
                        <th>Employees</th>
                        <th>Total Paid</th>
                        <th>Advance Cut</th>
                        <th>Advance Left</th>
                        <th>Paid On</th>
                        <th>Method</th>
                        <th>Print</th>
                        <th>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkHistory.map((payout, index) => {
                        const expanded = expandedBulkHistoryId === payout._id;
                        return (
                          <React.Fragment key={payout._id}>
                            <tr
                              className="payout-history-summary-row"
                              onClick={() => setExpandedBulkHistoryId(expanded ? null : payout._id)}
                            >
                              <td>{(bulkHistoryPage - 1) * 20 + index + 1}</td>
                              <td>
                                {formatBusinessDate(payout.startDate)} –{" "}
                                {formatBusinessDate(payout.endDate)}
                              </td>
                              <td>{payout.employeeCount}</td>
                              <td>₹{formatMoney(payout.totalNetPaid)}</td>
                              <td>₹{formatMoney(payout.totalAdvanceCut)}</td>
                              <td>₹{formatMoney(payout.totalAdvanceLeft)}</td>
                              <td>{formatBusinessDate(payout.paidOn)}</td>
                              <td>{formatPaymentMethod(payout.paymentMethod)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-secondary history-edit-btn"
                                  disabled
                                  title="Edit payout — coming in next phase"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-secondary history-print-btn"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handlePrintBulk(payout);
                                  }}
                                >
                                  Print
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-delete history-delete-btn"
                                  disabled={deletingBulkHistoryId === payout._id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteBulkHistory(payout);
                                  }}
                                >
                                  {deletingBulkHistoryId === payout._id ? "Deleting..." : "Delete"}
                                </button>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="payout-history-expanded-row">
                                <td colSpan="10">
                                  <div className="payout-history-details">
                                    {payout.employees?.map((line) => (
                                      <div key={line.employee} className="payout-history-line">
                                        <strong>{line.employeeName}</strong>
                                        <span>Working Time: {formatWorkingTime(line)}</span>
                                        <span>Gross: ₹{formatMoney(line.grossSalary)}</span>
                                        <span>
                                          Advance Left: ₹{formatMoney(line.outstandingAdvanceAfter)}
                                        </span>
                                        <span>
                                          Advance Cut: ₹{formatMoney(line.advanceDeducted)}
                                        </span>
                                        {Number(line.deductions || 0) > 0 && (
                                          <span>
                                            Other Deduction: ₹{formatMoney(line.deductions)}
                                          </span>
                                        )}
                                        <strong>Net Paid: ₹{formatMoney(line.netSalary)}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="payout-history-mobile-list">
                  {bulkHistory.map((payout, index) => {
                    const expanded = expandedBulkHistoryId === payout._id;
                    return (
                      <article
                        key={payout._id}
                        className="payout-history-mobile-card"
                        onClick={() => setExpandedBulkHistoryId(expanded ? null : payout._id)}
                      >
                        <strong>#{(bulkHistoryPage - 1) * 20 + index + 1}</strong>
                        <span>
                          {formatBusinessDate(payout.startDate)} –{" "}
                          {formatBusinessDate(payout.endDate)}
                        </span>
                        <span>{payout.employeeCount} Employees</span>
                        <div>
                          <strong>Total Paid</strong>
                          <span>₹{formatMoney(payout.totalNetPaid)}</span>
                        </div>
                        <div>
                          <strong>Paid On</strong>
                          <span>{formatBusinessDate(payout.paidOn)}</span>
                        </div>
                        <button
                          type="button"
                          className="ep-btn ep-btn-secondary history-edit-btn"
                          disabled
                          title="Edit payout — coming in next phase"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-secondary history-print-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePrintBulk(payout);
                          }}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-delete history-delete-btn"
                          disabled={deletingBulkHistoryId === payout._id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteBulkHistory(payout);
                          }}
                        >
                          {deletingBulkHistoryId === payout._id ? "Deleting..." : "Delete"}
                        </button>
                        {expanded && (
                          <div className="payout-history-mobile-expanded">
                            <span>Advance Cut: ₹{formatMoney(payout.totalAdvanceCut)}</span>
                            <span>Advance Left: ₹{formatMoney(payout.totalAdvanceLeft)}</span>
                            <span>Method: {formatPaymentMethod(payout.paymentMethod)}</span>
                            {payout.employees?.map((line) => (
                              <div key={line.employee} className="payout-history-line">
                                <strong>{line.employeeName}</strong>
                                <span>Working Time: {formatWorkingTime(line)}</span>
                                <span>Gross: ₹{formatMoney(line.grossSalary)}</span>
                                <span>
                                  Advance Left: ₹{formatMoney(line.outstandingAdvanceAfter)}
                                </span>
                                <span>Advance Cut: ₹{formatMoney(line.advanceDeducted)}</span>
                                {Number(line.deductions || 0) > 0 && (
                                  <span>Other Deduction: ₹{formatMoney(line.deductions)}</span>
                                )}
                                <strong>Net Paid: ₹{formatMoney(line.netSalary)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="payout-history-pagination">
                  <button
                    type="button"
                    disabled={bulkHistoryPage <= 1}
                    onClick={() => fetchBulkHistory(bulkHistoryPage - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {bulkHistoryMeta.page} of {bulkHistoryMeta.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={bulkHistoryPage >= bulkHistoryMeta.totalPages}
                    onClick={() => fetchBulkHistory(bulkHistoryPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            ))}

          {historyTab === "single" &&
            (singleHistoryLoading ? (
              <p className="payout-empty-state">Loading single payout history...</p>
            ) : singleHistory.length === 0 ? (
              <p className="payout-empty-state">No single payouts found.</p>
            ) : (
              <>
                <div className="payout-history-table-wrap">
                  <table className="payout-history-table">
                    <thead>
                      <tr>
                        <th>S.No.</th>
                        <th>Employee</th>
                        <th>Period</th>
                        <th>Net Paid</th>
                        <th>Paid On</th>
                        <th>Method</th>
                        <th>Print</th>
                        <th>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {singleHistory.map((payout, index) => {
                        const expanded = expandedSingleHistoryId === payout._id;
                        return (
                          <React.Fragment key={payout._id}>
                            <tr
                              className="payout-history-summary-row"
                              onClick={() =>
                                setExpandedSingleHistoryId(expanded ? null : payout._id)
                              }
                            >
                              <td>{(singleHistoryPage - 1) * 20 + index + 1}</td>
                              <td>{payout.employee?.name || "Employee"}</td>
                              <td>
                                {formatBusinessDate(payout.startDate)} –{" "}
                                {formatBusinessDate(payout.endDate)}
                              </td>
                              <td>₹{formatMoney(payout.netSalary)}</td>
                              <td>{formatBusinessDate(payout.paidOn)}</td>
                              <td>{formatPaymentMethod(payout.paymentMethod)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-secondary history-edit-btn"
                                  disabled
                                  title="Edit payout — coming in next phase"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-secondary history-print-btn"
                                  disabled
                                  title="Single payout printing will be enabled in the print-repair phase"
                                >
                                  Print
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-delete history-delete-btn"
                                  disabled={deletingSingleHistoryId === payout._id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteSingleHistory(payout);
                                  }}
                                >
                                  {deletingSingleHistoryId === payout._id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="payout-history-expanded-row">
                                <td colSpan="8">
                                  <div className="payout-history-line">
                                    <span>Working Time: {formatWorkingTime(payout)}</span>
                                    <span>Gross: ₹{formatMoney(payout.grossSalary)}</span>
                                    <span>
                                      Advance Left: ₹{formatMoney(payout.outstandingAdvanceAfter)}
                                    </span>
                                    <span>Advance Cut: ₹{formatMoney(payout.advanceDeducted)}</span>
                                    {Number(payout.deductions || 0) > 0 && (
                                      <span>
                                        Other Deduction: ₹{formatMoney(payout.deductions)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="payout-history-mobile-list">
                  {singleHistory.map((payout, index) => {
                    const expanded = expandedSingleHistoryId === payout._id;
                    return (
                      <article
                        key={payout._id}
                        className="payout-history-mobile-card"
                        onClick={() => setExpandedSingleHistoryId(expanded ? null : payout._id)}
                      >
                        <strong>#{(singleHistoryPage - 1) * 20 + index + 1}</strong>
                        <span>{payout.employee?.name || "Employee"}</span>
                        <span>
                          {formatBusinessDate(payout.startDate)} –{" "}
                          {formatBusinessDate(payout.endDate)}
                        </span>
                        <div>
                          <strong>Net Paid</strong>
                          <span>₹{formatMoney(payout.netSalary)}</span>
                        </div>
                        <div>
                          <strong>Paid On</strong>
                          <span>{formatBusinessDate(payout.paidOn)}</span>
                        </div>
                        <button
                          type="button"
                          className="ep-btn ep-btn-secondary history-edit-btn"
                          disabled
                          title="Edit payout — coming in next phase"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-secondary history-print-btn"
                          disabled
                          title="Single payout printing will be enabled in the print-repair phase"
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-delete history-delete-btn"
                          disabled={deletingSingleHistoryId === payout._id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteSingleHistory(payout);
                          }}
                        >
                          {deletingSingleHistoryId === payout._id ? "Deleting..." : "Delete"}
                        </button>
                        {expanded && (
                          <div className="payout-history-mobile-expanded">
                            <span>Method: {formatPaymentMethod(payout.paymentMethod)}</span>
                            <span>Working Time: {formatWorkingTime(payout)}</span>
                            <span>Gross: ₹{formatMoney(payout.grossSalary)}</span>
                            <span>
                              Advance Left: ₹{formatMoney(payout.outstandingAdvanceAfter)}
                            </span>
                            <span>Advance Cut: ₹{formatMoney(payout.advanceDeducted)}</span>
                            {Number(payout.deductions || 0) > 0 && (
                              <span>Other Deduction: ₹{formatMoney(payout.deductions)}</span>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="payout-history-pagination">
                  <button
                    type="button"
                    disabled={singleHistoryPage <= 1}
                    onClick={() => fetchSingleHistory(singleHistoryPage - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {singleHistoryMeta.page} of {singleHistoryMeta.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={singleHistoryPage >= singleHistoryMeta.totalPages}
                    onClick={() => fetchSingleHistory(singleHistoryPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            ))}
        </section>

        {/* =====================================
            SINGLE / BULK SWITCH
        ====================================== */}

        <div className="payout-create-heading">
          <h2>Create Payout</h2>
        </div>

        <div className="payout-mode-switch">
          <button
            type="button"
            className={payoutMode === "bulk" ? "payout-mode-btn active" : "payout-mode-btn"}
            onClick={() => changePayoutMode("bulk")}
          >
            Bulk Payout
          </button>

          <button
            type="button"
            className={payoutMode === "single" ? "payout-mode-btn active" : "payout-mode-btn"}
            onClick={() => changePayoutMode("single")}
          >
            Single Payout
          </button>
        </div>

        {/* =====================================
            SINGLE PAYOUT
        ====================================== */}

        {payoutMode === "single" && !singleResult && (
          <>
            <div className="payout-card">
              <div className="payout-card-header">
                <div>
                  <h2>Create Single Payout</h2>

                  <p>Calculate payout for one employee.</p>
                </div>
              </div>

              <div className="payout-period-section">
                <span className="payout-period-label">Payroll Period</span>

                <div className="payout-period-buttons">
                  {[
                    ["1-10", "1–10"],
                    ["11-20", "11–20"],
                    ["21-end", "21–Month End"],
                    ["custom", "Custom"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        singlePeriodType === value
                          ? "payout-period-btn active"
                          : "payout-period-btn"
                      }
                      onClick={() => setSinglePayrollPeriod(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <form className="payout-form" onSubmit={handlePreview}>
                <div className="payout-field">
                  <label>
                    Employee
                    <span>*</span>
                  </label>

                  <select
                    value={employeeId}
                    onChange={(event) => {
                      setEmployeeId(event.target.value);

                      clearMessage();

                      invalidateSinglePreview();
                    }}
                    className="ep-input"
                    disabled={loadingEmployees}
                  >
                    <option value="">
                      {loadingEmployees ? "Loading employees..." : "Select Employee"}
                    </option>

                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name}
                      </option>
                    ))}
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
                    onChange={(event) => {
                      setStartDate(event.target.value);

                      setSinglePeriodType("custom");

                      invalidateSinglePreview();
                    }}
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
                    onChange={(event) => {
                      setEndDate(event.target.value);

                      setSinglePeriodType("custom");

                      invalidateSinglePreview();
                    }}
                    className="ep-input"
                  />
                </div>

                <div className="payout-preview-action">
                  <button type="submit" className="ep-btn ep-btn-primary" disabled={isPreviewing}>
                    {isPreviewing ? "Calculating..." : "Preview Payout"}
                  </button>
                </div>
              </form>
            </div>

            {/* SINGLE PREVIEW */}

            {preview && (
              <div className="payout-card payout-preview-card">
                <div className="payout-card-header">
                  <div>
                    <h2>Payout Preview</h2>

                    <p>Review salary and deductions before creating payout.</p>
                  </div>
                </div>

                <div className="payout-preview-grid">
                  <div className="payout-stat">
                    <span>Working Time</span>

                    <strong>{formatWorkingTime(preview)}</strong>
                  </div>

                  <div className="payout-stat">
                    <span>Hours Worked</span>

                    <strong>{preview.totalHoursWorked || 0}h</strong>
                  </div>

                  <div className="payout-stat">
                    <span>Hourly Rate</span>

                    <strong>₹{formatMoney(preview.hourlyRate)}</strong>
                  </div>

                  <div className="payout-stat">
                    <span>Base Amount</span>

                    <strong>₹{formatMoney(preview.baseSalary)}</strong>
                  </div>

                  <div className="payout-stat">
                    <span>Overtime</span>

                    <strong>{preview.overtimeHours || 0}h</strong>
                  </div>

                  <div className="payout-stat">
                    <span>Gross Salary</span>

                    <strong>₹{formatMoney(preview.grossSalary)}</strong>
                  </div>
                </div>

                <div className="payout-deduction-section">
                  <div
                    className={
                      remainingAdvance > 0
                        ? "payout-outstanding warning"
                        : "payout-outstanding clear"
                    }
                  >
                    <span>Outstanding Advance</span>

                    <strong>₹{formatMoney(remainingAdvance)}</strong>
                  </div>

                  <div className="payout-deduction-grid">
                    <div className="payout-field">
                      <label>Advance Deduction</label>

                      <input
                        type="number"
                        value={advanceDeduction}
                        min={0}
                        max={remainingAdvance}
                        onChange={handleAdvanceChange}
                        className="ep-input ep-input-no-spinner"
                        disabled={remainingAdvance <= 0}
                      />

                      <div className="payout-deduction-buttons">
                        <button
                          type="button"
                          className="payout-small-btn"
                          onClick={() => setAdvanceDeduction(0)}
                        >
                          No Deduction
                        </button>

                        <button
                          type="button"
                          className="payout-small-btn"
                          disabled={remainingAdvance <= 0}
                          onClick={() => setAdvanceDeduction(Math.min(remainingAdvance))}
                        >
                          Recover Full
                        </button>
                      </div>
                    </div>

                    <div className="payout-field">
                      <label>Other Deduction</label>

                      <input
                        type="number"
                        value={otherDeduction}
                        min={0}
                        onChange={handleOtherDeductionChange}
                        className="ep-input ep-input-no-spinner"
                      />
                    </div>

                    <div className="payout-field">
                      <label>Payment Method</label>

                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        className="ep-input"
                      >
                        <option value="cash">Cash</option>

                        <option value="upi">UPI</option>

                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="payout-salary-summary">
                  <div>
                    <span>Gross Salary</span>

                    <strong>₹{formatMoney(grossSalary)}</strong>
                  </div>

                  <div>
                    <span>Advance Deduction</span>

                    <strong className="deduction">- ₹{formatMoney(advanceValue)}</strong>
                  </div>

                  <div>
                    <span>Other Deduction</span>

                    <strong className="deduction">- ₹{formatMoney(otherValue)}</strong>
                  </div>

                  <div className="payout-net-salary">
                    <span>Net Salary</span>

                    <strong>₹{formatMoney(netSalary)}</strong>
                  </div>
                </div>

                <div className="payout-create-action">
                  <button
                    type="button"
                    className="ep-btn ep-btn-primary"
                    onClick={handleCreatePayout}
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating Payout..." : "Create Payout"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {payoutMode === "single" && singleResult && (
          <div className="payout-card bulk-success-card">
            <div className="bulk-success-header">
              <h2>Payout Created Successfully</h2>
            </div>

            <div className="bulk-success-details">
              <div className="bulk-success-detail">
                <span>Employee</span>
                <strong>{singleResult.employee?.name || "Employee"}</strong>
              </div>

              <div className="bulk-success-detail">
                <span>Period</span>
                <strong>
                  {formatBusinessDate(singleResult.startDate)} –{" "}
                  {formatBusinessDate(singleResult.endDate)}
                </strong>
              </div>

              <div className="bulk-success-detail bulk-success-total">
                <span>Total Paid</span>
                <strong>₹{formatMoney(singleResult.netSalary)}</strong>
              </div>
            </div>

            <div className="bulk-success-actions">
              <button
                type="button"
                className="ep-btn ep-btn-primary"
                disabled
                title="Single payout printing will be enabled in the print-repair phase"
              >
                Print
              </button>

              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                onClick={handleCreateAnotherSinglePayout}
              >
                Create Another Payout
              </button>
            </div>
          </div>
        )}

        {/* =====================================
            BULK PAYOUT
        ====================================== */}

        {payoutMode === "bulk" && !bulkResult?.payout && (
          <>
            <div className="payout-card">
              <div className="payout-card-header">
                <div>
                  <h2>Bulk Payout</h2>

                  <p>
                    Preview attendance and salary for all eligible active employees before creating
                    payouts.
                  </p>
                </div>
              </div>

              <div className="payout-period-section">
                <span className="payout-period-label">Payroll Period</span>

                <div className="payout-period-buttons">
                  {[
                    ["1-10", "1–10"],
                    ["11-20", "11–20"],
                    ["21-end", "21–Month End"],
                    ["custom", "Custom"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        bulkPeriodType === value ? "payout-period-btn active" : "payout-period-btn"
                      }
                      onClick={() => setBulkPayrollPeriod(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <form className="bulk-payout-form" onSubmit={handleBulkPreview}>
                <div className="payout-field">
                  <label>
                    Start Date
                    <span>*</span>
                  </label>

                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(event) => {
                      setBulkStartDate(event.target.value);

                      invalidateBulkPreview();
                    }}
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
                    value={bulkEndDate}
                    onChange={(event) => {
                      setBulkEndDate(event.target.value);

                      invalidateBulkPreview();
                    }}
                    className="ep-input"
                  />
                </div>

                <div className="payout-field">
                  <label>Payment Method</label>

                  <select
                    value={bulkDefaultPaymentMethod}
                    onChange={handleBulkDefaultMethodChange}
                    className="ep-input"
                  >
                    <option value="cash">Cash</option>

                    <option value="upi">UPI</option>

                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div className="bulk-preview-button-wrap">
                  <button type="submit" className="ep-btn ep-btn-primary" disabled={bulkPreviewing}>
                    {bulkPreviewing ? "Calculating All..." : "Preview All Employees"}
                  </button>
                </div>
              </form>
            </div>

            {/* ===================================
                BULK PREVIEW TABLE
            ==================================== */}

            {calculatedBulkRows.length > 0 && (
              <div className="payout-card">
                <div className="payout-card-header bulk-preview-header">
                  <div>
                    <h2>Bulk Payout Preview</h2>

                    <p>
                      {formatInputDisplayDate(bulkStartDate)}
                      {" - "}
                      {formatInputDisplayDate(bulkEndDate)}
                    </p>
                  </div>

                  <div className="bulk-preview-count">{selectedBulkRows.length} selected</div>
                </div>

                <div className="bulk-select-bar">
                  <label>
                    <input
                      type="checkbox"
                      checked={allBulkSelected}
                      onChange={handleBulkSelectAll}
                    />

                    <span>Select All Payable Employees</span>
                  </label>

                  <span>Existing payouts are locked automatically.</span>
                </div>

                <div className="bulk-table-wrapper">
                  <table className="bulk-payout-table">
                    <thead>
                      <tr>
                        <th>Select</th>

                        <th>Employee</th>

                        <th>Working Time</th>

                        <th>Hours</th>

                        <th>Gross</th>

                        <th>Advance Outstanding</th>

                        <th>Advance Cut</th>

                        <th>Advance Left</th>

                        <th>Other Ded.</th>

                        <th>Net Salary</th>

                        <th>Method</th>
                      </tr>
                    </thead>

                    <tbody>
                      {calculatedBulkRows.map((row) => {
                        const locked = !row.selectable;

                        const zeroSalary = Number(row.grossSalary || 0) <= 0;

                        const maxAdvance = Number(row.remainingAdvance || 0);

                        return (
                          <tr
                            key={row.employeeId}
                            className={
                              locked
                                ? "bulk-row locked"
                                : zeroSalary
                                  ? "bulk-row zero-salary"
                                  : "bulk-row"
                            }
                          >
                            <td className="bulk-checkbox-cell">
                              <input
                                type="checkbox"
                                checked={Boolean(row.selected)}
                                disabled={locked}
                                onChange={() => handleBulkRowSelect(row.employeeId)}
                              />
                            </td>

                            <td className="bulk-employee-cell">
                              <strong>{row.employeeName}</strong>

                              {row.alreadyCreated && (
                                <span className="bulk-status-badge locked">
                                  {row.existingPayout?.sourceType
                                    ? "Already Paid"
                                    : "Already Created"}
                                </span>
                              )}

                              {!row.alreadyCreated && zeroSalary && (
                                <span className="bulk-status-badge zero">No Payable Salary</span>
                              )}

                              {row.alreadyCreated && row.existingPayout && (
                                <small>
                                  {row.existingPayout.sourceLabel || "Existing"}:{" "}
                                  {formatDisplayDate(row.existingPayout.startDate)}
                                  {" - "}
                                  {formatDisplayDate(row.existingPayout.endDate)}
                                </small>
                              )}
                            </td>

                            <td>{formatWorkingTime(row)}</td>

                            <td>{row.totalHoursWorked || 0}h</td>

                            <td>₹{formatMoney(row.grossSalary)}</td>

                            <td>₹{formatMoney(row.remainingAdvance)}</td>

                            <td>
                              <div className="bulk-deduction-control">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxAdvance}
                                  value={row.advanceDeducted}
                                  disabled={locked || maxAdvance <= 0}
                                  onChange={(event) =>
                                    handleBulkAdvanceChange(row.employeeId, event.target.value)
                                  }
                                  className="bulk-money-input"
                                />

                                <div className="bulk-mini-actions">
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => handleBulkAdvanceChange(row.employeeId, "0")}
                                  >
                                    Zero
                                  </button>

                                  <button
                                    type="button"
                                    disabled={locked || maxAdvance <= 0}
                                    onClick={() => recoverFullBulkAdvance(row.employeeId)}
                                  >
                                    Full
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="bulk-advance-left">
                              ₹{formatMoney(row.calculatedAdvanceLeft)}
                            </td>

                            <td>
                              <input
                                type="number"
                                min={0}
                                value={row.otherDeduction}
                                disabled={locked}
                                onChange={(event) =>
                                  handleBulkOtherDeductionChange(row.employeeId, event.target.value)
                                }
                                className="bulk-money-input"
                              />
                            </td>

                            <td className="bulk-net-value">₹{formatMoney(row.calculatedNet)}</td>

                            <td>
                              <select
                                value={row.paymentMethod || bulkDefaultPaymentMethod}
                                disabled={locked}
                                onChange={(event) =>
                                  handleBulkMethodChange(row.employeeId, event.target.value)
                                }
                                className="bulk-method-select"
                              >
                                <option value="cash">Cash</option>

                                <option value="upi">UPI</option>

                                <option value="bank">Bank</option>

                                <option value="cheque">Cheque</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bulk-mobile-card-list">
                  {calculatedBulkRows.map((row) => {
                    const locked = !row.selectable;

                    const zeroSalary = Number(row.grossSalary || 0) <= 0;

                    const maxAdvance = Number(row.remainingAdvance || 0);

                    return (
                      <article
                        key={row.employeeId}
                        className={
                          locked
                            ? "bulk-mobile-card locked"
                            : zeroSalary
                              ? "bulk-mobile-card zero-salary"
                              : "bulk-mobile-card"
                        }
                      >
                        <div className="bulk-mobile-card-header">
                          <input
                            type="checkbox"
                            checked={Boolean(row.selected)}
                            disabled={locked}
                            onChange={() => handleBulkRowSelect(row.employeeId)}
                          />

                          <div className="bulk-mobile-employee">
                            <strong>{row.employeeName}</strong>

                            <div className="bulk-mobile-statuses">
                              {row.alreadyCreated && (
                                <span className="bulk-status-badge locked">
                                  {row.existingPayout?.sourceType
                                    ? "Already Paid"
                                    : "Already Created"}
                                </span>
                              )}

                              {row.alreadyCreated && row.existingPayout && (
                                <small>
                                  {row.existingPayout.sourceLabel || "Existing"}:{" "}
                                  {formatDisplayDate(row.existingPayout.startDate)}
                                  {" - "}
                                  {formatDisplayDate(row.existingPayout.endDate)}
                                </small>
                              )}

                              {!row.alreadyCreated && zeroSalary && (
                                <span className="bulk-status-badge zero">No Payable Salary</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bulk-mobile-values">
                          <div>
                            <span>Working Time</span>
                            <strong>{formatWorkingTime(row)}</strong>
                          </div>

                          <div>
                            <span>Gross</span>
                            <strong>₹{formatMoney(row.grossSalary)}</strong>
                          </div>

                          <div>
                            <span>Advance Outstanding</span>
                            <strong>₹{formatMoney(row.remainingAdvance)}</strong>
                          </div>

                          <div>
                            <span>Advance Left</span>
                            <strong>₹{formatMoney(row.calculatedAdvanceLeft)}</strong>
                          </div>
                        </div>

                        <div className="bulk-mobile-inputs">
                          <label>
                            <span>Advance Cut</span>

                            <input
                              type="number"
                              min={0}
                              max={maxAdvance}
                              value={row.advanceDeducted}
                              disabled={locked || maxAdvance <= 0}
                              onChange={(event) =>
                                handleBulkAdvanceChange(row.employeeId, event.target.value)
                              }
                              className="bulk-money-input"
                            />
                          </label>

                          <div className="bulk-mini-actions">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => handleBulkAdvanceChange(row.employeeId, "0")}
                            >
                              Zero
                            </button>

                            <button
                              type="button"
                              disabled={locked || maxAdvance <= 0}
                              onClick={() => recoverFullBulkAdvance(row.employeeId)}
                            >
                              Full
                            </button>
                          </div>

                          <label>
                            <span>Other Deduction</span>

                            <input
                              type="number"
                              min={0}
                              value={row.otherDeduction}
                              disabled={locked}
                              onChange={(event) =>
                                handleBulkOtherDeductionChange(row.employeeId, event.target.value)
                              }
                              className="bulk-money-input"
                            />
                          </label>
                        </div>

                        <div className="bulk-mobile-net-paid">
                          <span>Net Paid</span>
                          <strong>₹{formatMoney(row.calculatedNet)}</strong>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* =================================
                    BULK SUMMARY
                ================================== */}

                <div className="bulk-summary">
                  <div className="bulk-summary-grid">
                    <div>
                      <span>Employees Selected</span>

                      <strong>{bulkTotals.employeeCount}</strong>
                    </div>

                    <div>
                      <span>Total Gross</span>

                      <strong>₹{formatMoney(bulkTotals.grossSalary)}</strong>
                    </div>

                    <div>
                      <span>Advance Recovery</span>

                      <strong>₹{formatMoney(bulkTotals.advanceDeduction)}</strong>
                    </div>

                    <div>
                      <span>Other Deduction</span>

                      <strong>₹{formatMoney(bulkTotals.otherDeduction)}</strong>
                    </div>

                    <div className="bulk-summary-net">
                      <span>Total Net Payout</span>

                      <strong>₹{formatMoney(bulkTotals.netSalary)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ep-btn ep-btn-primary bulk-create-btn"
                    disabled={bulkCreating || selectedBulkRows.length === 0}
                    onClick={handleBulkCreate}
                  >
                    {bulkCreating
                      ? "Creating Payouts..."
                      : `Create ${selectedBulkRows.length} Payout${
                          selectedBulkRows.length === 1 ? "" : "s"
                        }`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {payoutMode === "bulk" && bulkResult?.payout && (
          <div className="payout-card bulk-success-card">
            <div className="bulk-success-header">
              <h2>Payout Created Successfully</h2>
            </div>

            <div className="bulk-success-details">
              <div className="bulk-success-detail">
                <span>Period</span>
                <strong>
                  {formatBusinessDate(bulkResult.payout.startDate)} –{" "}
                  {formatBusinessDate(bulkResult.payout.endDate)}
                </strong>
              </div>

              <div className="bulk-success-detail">
                <span>Employees</span>
                <strong>{bulkResult.payout.employeeCount}</strong>
              </div>

              <div className="bulk-success-detail bulk-success-total">
                <span>Total Paid</span>
                <strong>₹{formatMoney(bulkResult.payout.totalNetPaid)}</strong>
              </div>
            </div>

            <div className="bulk-success-actions">
              <button
                type="button"
                className="ep-btn ep-btn-primary"
                onClick={() => handlePrintBulk(bulkResult.payout)}
              >
                Print
              </button>

              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                onClick={handleCreateAnotherBulkPayout}
              >
                Create Another Payout
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
              <h2>Payout Records</h2>

              <p>Search, update and manage employee payout history.</p>
            </div>
          </div>

          <div className="payout-filters">
            <div className="payout-field">
              <label>Employee Name</label>

              <input
                type="text"
                placeholder="Search employee"
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                className="ep-input"
              />
            </div>

            <div className="payout-field">
              <label>Date</label>

              <input
                type="date"
                value={searchDate}
                onChange={(event) => setSearchDate(event.target.value)}
                className="ep-input"
              />
            </div>

            <button
              type="button"
              className="ep-btn ep-btn-secondary payout-filter-btn"
              onClick={() => {
                setSearchName("");
                setSearchDate("");
              }}
              disabled={!searchName && !searchDate}
            >
              Clear Filters
            </button>

            {selectedPayouts.length > 0 && (
              <button
                type="button"
                className="ep-btn ep-btn-delete payout-filter-btn"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? "Deleting..." : `Delete Selected (${selectedPayouts.length})`}
              </button>
            )}
          </div>

          {loadingPayouts ? (
            <div className="payout-state">Loading payout records...</div>
          ) : filteredPayouts.length === 0 ? (
            <div className="payout-state">No payout records found.</div>
          ) : (
            <div className="payout-table-wrapper">
              <table className="ep-table payout-table">
                <thead>
                  <tr>
                    <th className="payout-checkbox-column">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={handleSelectAll}
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
                    <th>Other Ded.</th>
                    <th>Net Salary</th>
                    <th>Status / Actions</th>
                    <th>Paid On</th>
                    <th>Method</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayouts.map((payout, index) => (
                    <tr key={payout._id}>
                      <td className="payout-checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedPayouts.includes(payout._id)}
                          onChange={() => handleSelect(payout._id)}
                        />
                      </td>

                      <td>{index + 1}</td>

                      <td>
                        <strong>{payout.employee?.name || "-"}</strong>
                      </td>

                      <td className="payout-period-cell">
                        {formatDisplayDate(payout.startDate)}

                        <span>to</span>

                        {formatDisplayDate(payout.endDate)}
                      </td>

                      <td>{payout.totalDaysWorked || 0}</td>

                      <td>{payout.totalHoursWorked ?? 0}h</td>

                      <td>₹{formatMoney(payout.baseSalary)}</td>

                      <td>
                        {payout.overtimeHours || 0}
                        h
                        <br />₹{formatMoney(payout.overtimeAmount)}
                      </td>

                      <td>₹{formatMoney(payout.advanceDeducted)}</td>

                      <td>₹{formatMoney(payout.deductions)}</td>

                      <td>
                        <strong className="payout-net-value">
                          ₹{formatMoney(payout.netSalary)}
                        </strong>
                      </td>

                      <td>
                        <div className="payout-record-actions">
                          <select
                            value={payout.status || "Pending"}
                            onChange={(event) => handleStatusChange(payout, event.target.value)}
                            className={`payout-status-select ${
                              payout.status === "Paid" ? "paid" : "pending"
                            }`}
                            disabled={updatingStatusId === payout._id}
                          >
                            <option value="Pending">Pending</option>

                            <option value="Paid">Paid</option>
                          </select>

                          <button
                            type="button"
                            className="payout-action-btn slip"
                            onClick={() =>
                              navigate("/admin/salary-slip", {
                                state: payout,
                              })
                            }
                          >
                            Salary Slip
                          </button>

                          <button
                            type="button"
                            className="payout-action-btn delete"
                            onClick={() => handleDeletePayout(payout)}
                            disabled={deletingId === payout._id}
                          >
                            {deletingId === payout._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>

                      <td>{formatDisplayDate(payout.paidOn)}</td>

                      <td className="payout-method">
                        {payout.paymentMethod ? payout.paymentMethod.toUpperCase() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {printPayout &&
        createPortal(
          <div id="payout-print-root">
            <section className="payout-print-report">
              <header className="payout-print-header">
                <strong>NCH</strong>
                <span>NEW CALCUTTA HANDLOOM</span>
              </header>

              <div className="payout-print-info">
                <span>
                  <strong>Period:</strong> {formatBusinessDate(printPayout.startDate)} –{" "}
                  {formatBusinessDate(printPayout.endDate)}
                </span>
                <span>
                  <strong>Paid On:</strong> {formatBusinessDate(printPayout.paidOn)}
                </span>
              </div>

              <table className="payout-print-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Working Time</th>
                    <th>Gross</th>
                    <th>Advance Left</th>
                    <th>Advance Cut</th>
                    <th>Net Paid</th>
                    <th>Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {printPayout.employees.map((employee, index) => (
                    <tr key={employee.employee || employee._id || index}>
                      <td>{employee.employeeName || "-"}</td>
                      <td>{formatWorkingTime(employee)}</td>
                      <td>₹{formatMoney(employee.grossSalary)}</td>
                      <td>₹{formatMoney(employee.outstandingAdvanceAfter)}</td>
                      <td>₹{formatMoney(employee.advanceDeducted)}</td>
                      <td>₹{formatMoney(employee.netSalary)}</td>
                      <td className="payout-print-signature">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <section className="payout-print-summary" aria-label="Payout summary">
                <div>
                  <span>Total Gross</span>
                  <strong>₹{formatMoney(printPayout.totalGross)}</strong>
                </div>
                <div>
                  <span>Total Advance Cut</span>
                  <strong>₹{formatMoney(printPayout.totalAdvanceCut)}</strong>
                </div>
                <div>
                  <span>Total Advance Left</span>
                  <strong>₹{formatMoney(printPayout.totalAdvanceLeft)}</strong>
                </div>
                <div>
                  <span>Total Other Deduction</span>
                  <strong>₹{formatMoney(printPayout.totalOtherDeduction)}</strong>
                </div>
                <div>
                  <span>Total Paid</span>
                  <strong>₹{formatMoney(printPayout.totalNetPaid)}</strong>
                </div>
                <div>
                  <span>Payment Method</span>
                  <strong>{formatBulkPaymentMethod(printPayout)}</strong>
                </div>
              </section>
            </section>
          </div>,
          document.body
        )}
    </>
  );
};

export default PayoutPage;
