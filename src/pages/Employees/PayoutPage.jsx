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


/* ==========================================================
   HELPERS
========================================================== */

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


const formatInputDisplayDate = (date) => {
  if (!date) return "-";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};


const formatMoney = (value) =>
  Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );


const getPeriodDates = (type) => {
  const today = new Date();

  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  if (type === "1-10") {
    return {
      startDate:
        formatInputDate(
          year,
          month,
          1
        ),

      endDate:
        formatInputDate(
          year,
          month,
          10
        ),
    };
  }

  if (type === "11-20") {
    return {
      startDate:
        formatInputDate(
          year,
          month,
          11
        ),

      endDate:
        formatInputDate(
          year,
          month,
          20
        ),
    };
  }

  if (type === "21-end") {
    const lastDay =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    return {
      startDate:
        formatInputDate(
          year,
          month,
          21
        ),

      endDate:
        formatInputDate(
          year,
          month,
          lastDay
        ),
    };
  }

  return {
    startDate: "",
    endDate: "",
  };
};


const splitIntoPages = (
  items,
  size
) => {
  const pages = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    pages.push(
      items.slice(
        index,
        index + size
      )
    );
  }

  return pages;
};


/* ==========================================================
   COMPONENT
========================================================== */

const PayoutPage = () => {
  const navigate =
    useNavigate();

  const creatingRef =
    useRef(false);


  /* ========================================================
     PAGE MODE
  ======================================================== */

  const [
    payoutMode,
    setPayoutMode,
  ] = useState("single");


  /* ========================================================
     COMMON DATA
  ======================================================== */

  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    payouts,
    setPayouts,
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
    message,
    setMessage,
  ] = useState({
    type: "",
    text: "",
  });


  /* ========================================================
     SINGLE PAYOUT STATE
  ======================================================== */

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    singlePeriodType,
    setSinglePeriodType,
  ] = useState("custom");

  const [
    preview,
    setPreview,
  ] = useState(null);

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

  const [
    isPreviewing,
    setIsPreviewing,
  ] = useState(false);

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);


  /* ========================================================
     PAYOUT RECORDS STATE
  ======================================================== */

  const [
    searchName,
    setSearchName,
  ] = useState("");

  const [
    searchDate,
    setSearchDate,
  ] = useState("");

  const [
    selectedPayouts,
    setSelectedPayouts,
  ] = useState([]);

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


  /* ========================================================
     BULK PAYOUT STATE
  ======================================================== */

  const [
    bulkPeriodType,
    setBulkPeriodType,
  ] = useState("custom");

  const [
    bulkStartDate,
    setBulkStartDate,
  ] = useState("");

  const [
    bulkEndDate,
    setBulkEndDate,
  ] = useState("");

  const [
    bulkDefaultPaymentMethod,
    setBulkDefaultPaymentMethod,
  ] = useState("cash");

  const [
    bulkRows,
    setBulkRows,
  ] = useState([]);

  const [
    bulkPreviewing,
    setBulkPreviewing,
  ] = useState(false);

  const [
    bulkCreating,
    setBulkCreating,
  ] = useState(false);

  const [
    bulkResult,
    setBulkResult,
  ] = useState(null);

  const [
    bulkCreatedAt,
    setBulkCreatedAt,
  ] = useState(null);


  /* ========================================================
     INITIAL LOAD
  ======================================================== */

  useEffect(() => {
    fetchEmployees();
    fetchPayouts();
  }, []);


  useEffect(() => {
    setSelectedPayouts([]);
  }, [
    searchName,
    searchDate,
  ]);


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

      const res =
        await api.get(
          "/employees"
        );

      const list =
        Array.isArray(res.data)
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
        err.response?.data
          ?.message ||
          "Unable to load employees."
      );
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

      const res =
        await api.get(
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
        err.response?.data
          ?.message ||
          "Unable to load payout records."
      );
    } finally {
      setLoadingPayouts(false);
    }
  };


  /* ========================================================
     MODE SWITCH
  ======================================================== */

  const changePayoutMode = (
    mode
  ) => {
    clearMessage();

    setPayoutMode(mode);
  };


  /* ========================================================
     SINGLE PAYOUT PERIOD
  ======================================================== */

  const setSinglePayrollPeriod = (
    type
  ) => {
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

    const dates =
      getPeriodDates(type);

    setStartDate(
      dates.startDate
    );

    setEndDate(
      dates.endDate
    );
  };


  const invalidateSinglePreview = () => {
    setPreview(null);

    setAdvanceDeduction("");
    setOtherDeduction("");
  };


  /* ========================================================
     SINGLE PREVIEW
  ======================================================== */

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

    if (
      endDate < startDate
    ) {
      showError(
        "End date cannot be before start date."
      );

      return;
    }

    try {
      setIsPreviewing(true);

      const res =
        await api.post(
          "/payout/preview",
          {
            employeeId,
            startDate,
            endDate,
          }
        );

      setPreview(
        res.data
      );

      setAdvanceDeduction(
        0
      );

      setOtherDeduction(
        0
      );
    } catch (err) {
      console.error(
        "Payout preview error:",
        err
      );

      showError(
        err.response?.data
          ?.message ||
          "Unable to calculate payout."
      );
    } finally {
      setIsPreviewing(false);
    }
  };


  const remainingAdvance =
    Number(
      preview?.remainingAdvance ||
        0
    );

  const grossSalary =
    Number(
      preview?.grossSalary ||
        0
    );

  const advanceValue =
    Number(
      advanceDeduction ||
        0
    );

  const otherValue =
    Number(
      otherDeduction ||
        0
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


  /* ========================================================
     SINGLE DEDUCTIONS
  ======================================================== */

  const handleAdvanceChange = (
    event
  ) => {
    const raw =
      event.target.value;

    if (raw === "") {
      setAdvanceDeduction("");
      return;
    }

    let value =
      Number(raw);

    if (
      Number.isNaN(value) ||
      value < 0
    ) {
      value = 0;
    }

    value =
      Math.min(
        value,
        remainingAdvance,
        grossSalary
      );

    setAdvanceDeduction(
      value
    );

    if (
      Number(
        otherDeduction ||
          0
      ) >
      grossSalary -
        value
    ) {
      setOtherDeduction(
        Math.max(
          0,
          grossSalary -
            value
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

    let value =
      Number(raw);

    if (
      Number.isNaN(value) ||
      value < 0
    ) {
      value = 0;
    }

    value =
      Math.min(
        value,
        maxOtherDeduction
      );

    setOtherDeduction(
      value
    );

    clearMessage();
  };


  /* ========================================================
     CREATE SINGLE PAYOUT
  ======================================================== */

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
          advanceDeduction ||
            0
        );

      const deduction =
        Number(
          otherDeduction ||
            0
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
        advance +
          deduction >
        grossSalary
      ) {
        showError(
          "Total deductions cannot be greater than gross salary."
        );

        return;
      }

      creatingRef.current =
        true;

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

        setSinglePeriodType(
          "custom"
        );

        setAdvanceDeduction("");
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


  /* ========================================================
     BULK PAYOUT PERIOD
  ======================================================== */

  const invalidateBulkPreview = () => {
    setBulkRows([]);

    setBulkResult(null);

    setBulkCreatedAt(null);
  };


  const setBulkPayrollPeriod = (
    type
  ) => {
    clearMessage();

    invalidateBulkPreview();

    setBulkPeriodType(type);

    if (type === "custom") {
      setBulkStartDate("");
      setBulkEndDate("");

      return;
    }

    const dates =
      getPeriodDates(type);

    setBulkStartDate(
      dates.startDate
    );

    setBulkEndDate(
      dates.endDate
    );
  };


  /* ========================================================
     BULK PREVIEW
  ======================================================== */

  const handleBulkPreview =
    async (event) => {
      event.preventDefault();

      clearMessage();

      setBulkResult(null);
      setBulkCreatedAt(null);

      if (
        !bulkStartDate ||
        !bulkEndDate
      ) {
        showError(
          "Please select the bulk payroll period."
        );

        return;
      }

      if (
        bulkEndDate <
        bulkStartDate
      ) {
        showError(
          "End date cannot be before start date."
        );

        return;
      }

      try {
        setBulkPreviewing(true);

        const res =
          await api.post(
            "/payout/bulk-preview",
            {
              startDate:
                bulkStartDate,

              endDate:
                bulkEndDate,
            }
          );

        const rows =
          Array.isArray(
            res.data?.employees
          )
            ? res.data.employees
            : [];

        const preparedRows =
          rows.map((row) => ({
            ...row,

            selected:
              Boolean(
                row.selectedByDefault
              ),

            advanceDeducted:
              0,

            otherDeduction:
              0,

            paymentMethod:
              bulkDefaultPaymentMethod,
          }));

        setBulkRows(
          preparedRows
        );

        if (
          preparedRows.length ===
          0
        ) {
          showWarning(
            "No active employees have attendance marked for this period."
          );
        } else {
          showSuccess(
            `Bulk preview generated for ${preparedRows.length} employee(s).`
          );
        }
      } catch (err) {
        console.error(
          "Bulk preview error:",
          err
        );

        setBulkRows([]);

        showError(
          err.response?.data
            ?.message ||
            "Unable to generate bulk payout preview."
        );
      } finally {
        setBulkPreviewing(
          false
        );
      }
    };


  /* ========================================================
     BULK ROW UPDATE
  ======================================================== */

  const updateBulkRow = (
    employeeIdValue,
    updater
  ) => {
    setBulkRows(
      (previous) =>
        previous.map(
          (row) => {
            if (
              String(
                row.employeeId
              ) !==
              String(
                employeeIdValue
              )
            ) {
              return row;
            }

            return typeof updater ===
              "function"
              ? updater(row)
              : {
                  ...row,
                  ...updater,
                };
          }
        )
    );
  };


  /* ========================================================
     BULK SELECTION
  ======================================================== */

  const handleBulkRowSelect = (
    employeeIdValue
  ) => {
    updateBulkRow(
      employeeIdValue,
      (row) => {
        if (!row.selectable) {
          return row;
        }

        return {
          ...row,
          selected:
            !row.selected,
        };
      }
    );
  };


  const selectablePayableRows =
    bulkRows.filter(
      (row) =>
        row.selectable &&
        Number(
          row.grossSalary ||
            0
        ) > 0
    );


  const allBulkSelected =
    selectablePayableRows.length >
      0 &&
    selectablePayableRows.every(
      (row) =>
        row.selected
    );


  const handleBulkSelectAll = (
    event
  ) => {
    const checked =
      event.target.checked;

    setBulkRows(
      (previous) =>
        previous.map(
          (row) => {
            /*
             * Select All automatically selects
             * payable employees only.
             *
             * ₹0 employees remain unchecked,
             * but their individual checkbox can
             * still be manually selected.
             */
            if (
              !row.selectable ||
              Number(
                row.grossSalary ||
                  0
              ) <= 0
            ) {
              return {
                ...row,
                selected: false,
              };
            }

            return {
              ...row,
              selected:
                checked,
            };
          }
        )
    );
  };


  /* ========================================================
     BULK ADVANCE DEDUCTION
  ======================================================== */

  const handleBulkAdvanceChange = (
    employeeIdValue,
    raw
  ) => {
    updateBulkRow(
      employeeIdValue,
      (row) => {
        if (!row.selectable) {
          return row;
        }

        const gross =
          Number(
            row.grossSalary ||
              0
          );

        const remaining =
          Number(
            row.remainingAdvance ||
              0
          );

        let value =
          raw === ""
            ? ""
            : Number(raw);

        if (
          value !== "" &&
          (
            Number.isNaN(value) ||
            value < 0
          )
        ) {
          value = 0;
        }

        if (value !== "") {
          value =
            Math.min(
              value,
              remaining,
              gross
            );
        }

        const advance =
          Number(value || 0);

        const maxOther =
          Math.max(
            0,
            gross -
              advance
          );

        let other =
          Number(
            row.otherDeduction ||
              0
          );

        if (
          other >
          maxOther
        ) {
          other =
            maxOther;
        }

        return {
          ...row,

          advanceDeducted:
            value,

          otherDeduction:
            other,
        };
      }
    );
  };


  const recoverFullBulkAdvance = (
    employeeIdValue
  ) => {
    updateBulkRow(
      employeeIdValue,
      (row) => {
        if (!row.selectable) {
          return row;
        }

        const gross =
          Number(
            row.grossSalary ||
              0
          );

        const remaining =
          Number(
            row.remainingAdvance ||
              0
          );

        const advance =
          Math.min(
            remaining,
            gross
          );

        const maxOther =
          Math.max(
            0,
            gross -
              advance
          );

        return {
          ...row,

          advanceDeducted:
            advance,

          otherDeduction:
            Math.min(
              Number(
                row.otherDeduction ||
                  0
              ),
              maxOther
            ),
        };
      }
    );
  };


  /* ========================================================
     BULK OTHER DEDUCTION
  ======================================================== */

  const handleBulkOtherDeductionChange = (
    employeeIdValue,
    raw
  ) => {
    updateBulkRow(
      employeeIdValue,
      (row) => {
        if (!row.selectable) {
          return row;
        }

        const gross =
          Number(
            row.grossSalary ||
              0
          );

        const advance =
          Number(
            row.advanceDeducted ||
              0
          );

        const maxOther =
          Math.max(
            0,
            gross -
              advance
          );

        let value =
          raw === ""
            ? ""
            : Number(raw);

        if (
          value !== "" &&
          (
            Number.isNaN(value) ||
            value < 0
          )
        ) {
          value = 0;
        }

        if (value !== "") {
          value =
            Math.min(
              value,
              maxOther
            );
        }

        return {
          ...row,

          otherDeduction:
            value,
        };
      }
    );
  };


  /* ========================================================
     BULK PAYMENT METHOD
  ======================================================== */

  const handleBulkDefaultMethodChange = (
    event
  ) => {
    const value =
      event.target.value;

    setBulkDefaultPaymentMethod(
      value
    );

    setBulkRows(
      (previous) =>
        previous.map(
          (row) => ({
            ...row,

            paymentMethod:
              row.selectable
                ? value
                : row.paymentMethod,
          })
        )
    );
  };


  const handleBulkMethodChange = (
    employeeIdValue,
    value
  ) => {
    updateBulkRow(
      employeeIdValue,
      {
        paymentMethod:
          value,
      }
    );
  };


  /* ========================================================
     BULK CALCULATED ROWS
  ======================================================== */

  const calculatedBulkRows =
    useMemo(
      () =>
        bulkRows.map(
          (row) => {
            const gross =
              Number(
                row.grossSalary ||
                  0
              );

            const advance =
              Number(
                row.advanceDeducted ||
                  0
              );

            const other =
              Number(
                row.otherDeduction ||
                  0
              );

            const net =
              Math.max(
                0,
                gross -
                  advance -
                  other
              );

            const advanceLeft =
              Math.max(
                0,
                Number(
                  row.remainingAdvance ||
                    0
                ) -
                  advance
              );

            return {
              ...row,

              calculatedNet:
                net,

              calculatedAdvanceLeft:
                advanceLeft,
            };
          }
        ),
      [bulkRows]
    );


  const selectedBulkRows =
    useMemo(
      () =>
        calculatedBulkRows.filter(
          (row) =>
            row.selected &&
            row.selectable
        ),
      [calculatedBulkRows]
    );


  const bulkTotals =
    useMemo(
      () =>
        selectedBulkRows.reduce(
          (
            totals,
            row
          ) => {
            totals.employeeCount +=
              1;

            totals.grossSalary +=
              Number(
                row.grossSalary ||
                  0
              );

            totals.advanceDeduction +=
              Number(
                row.advanceDeducted ||
                  0
              );

            totals.otherDeduction +=
              Number(
                row.otherDeduction ||
                  0
              );

            totals.netSalary +=
              Number(
                row.calculatedNet ||
                  0
              );

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

  const handleBulkCreate =
    async () => {
      if (
        selectedBulkRows.length ===
        0
      ) {
        showError(
          "Please select at least one employee."
        );

        return;
      }

      const confirmed =
        window.confirm(
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

        const payload =
          selectedBulkRows.map(
            (row) => ({
              employeeId:
                row.employeeId,

              employeeName:
                row.employeeName,

              advanceDeducted:
                Number(
                  row.advanceDeducted ||
                    0
                ),

              deductions:
                Number(
                  row.otherDeduction ||
                    0
                ),

              paymentMethod:
                row.paymentMethod ||
                bulkDefaultPaymentMethod,
            })
          );

        const res =
          await api.post(
            "/payout/bulk",
            {
              startDate:
                bulkStartDate,

              endDate:
                bulkEndDate,

              payouts:
                payload,
            }
          );

        const result =
          res.data || {};

        const created =
          Array.isArray(
            result.created
          )
            ? result.created
            : [];

        const failed =
          Array.isArray(
            result.failed
          )
            ? result.failed
            : [];

        setBulkResult({
          ...result,
          created,
          failed,
        });

        setBulkCreatedAt(
          new Date()
        );

        /*
         * Successful rows become locked locally
         * immediately, so the user cannot click
         * Create again for the same rows.
         */
        const createdIds =
          new Set(
            created.map(
              (item) =>
                String(
                  item.employeeId
                )
            )
          );

        setBulkRows(
          (previous) =>
            previous.map(
              (row) => {
                if (
                  !createdIds.has(
                    String(
                      row.employeeId
                    )
                  )
                ) {
                  return row;
                }

                return {
                  ...row,

                  selected: false,

                  selectable: false,

                  alreadyCreated:
                    true,

                  existingPayout: {
                    startDate:
                      bulkStartDate,

                    endDate:
                      bulkEndDate,

                    status:
                      "Pending",
                  },
                };
              }
            )
        );

        if (
          failed.length > 0
        ) {
          showWarning(
            `${created.length} payout(s) created successfully. ${failed.length} payout(s) failed.`
          );
        } else {
          showSuccess(
            `${created.length} payout(s) created successfully.`
          );
        }

        await fetchPayouts();
      } catch (err) {
        console.error(
          "Bulk payout creation error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Unable to create bulk payouts."
        );
      } finally {
        setBulkCreating(
          false
        );
      }
    };


  /* ========================================================
     PRINT SUCCESSFUL BULK PAYOUTS
  ======================================================== */

  const handlePrintBulk = () => {
    if (
      !bulkResult?.created?.length
    ) {
      showError(
        "There are no successfully created bulk payouts to print."
      );

      return;
    }

    window.print();
  };


  const bulkPrintPages =
    useMemo(
      () =>
        splitIntoPages(
          bulkResult?.created ||
            [],
          12
        ),
      [bulkResult]
    );


  /* ========================================================
     DELETE SINGLE PAYOUT
  ======================================================== */

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


  /* ========================================================
     PAYOUT RECORD FILTERING
  ======================================================== */

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


  /* ========================================================
     PAYOUT RECORD SELECTION
  ======================================================== */

  const allFilteredSelected =
    filteredPayouts.length >
      0 &&
    filteredPayouts.every(
      (payout) =>
        selectedPayouts.includes(
          payout._id
        )
    );


  const handleSelectAll = (
    event
  ) => {
    if (
      event.target.checked
    ) {
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


  /* ========================================================
     BULK DELETE OLD RECORDS
  ======================================================== */

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


  /* ========================================================
     UPDATE PAYOUT STATUS
  ======================================================== */

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
            status:
              newStatus,
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
            <h1>
              Employee Payouts
            </h1>

            <p>
              Calculate salaries,
              recover advances and manage
              employee payouts.
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
            SINGLE / BULK SWITCH
        ====================================== */}

        <div className="payout-mode-switch">

          <button
            type="button"
            className={
              payoutMode ===
              "single"
                ? "payout-mode-btn active"
                : "payout-mode-btn"
            }
            onClick={() =>
              changePayoutMode(
                "single"
              )
            }
          >
            Single Payout
          </button>

          <button
            type="button"
            className={
              payoutMode ===
              "bulk"
                ? "payout-mode-btn active"
                : "payout-mode-btn"
            }
            onClick={() =>
              changePayoutMode(
                "bulk"
              )
            }
          >
            Bulk Payout
          </button>

        </div>


        {/* =====================================
            SINGLE PAYOUT
        ====================================== */}

        {payoutMode ===
          "single" && (
          <>

            <div className="payout-card">

              <div className="payout-card-header">

                <div>
                  <h2>
                    Create Single Payout
                  </h2>

                  <p>
                    Calculate payout for
                    one employee.
                  </p>
                </div>

              </div>


              <div className="payout-period-section">

                <span className="payout-period-label">
                  Payroll Period
                </span>

                <div className="payout-period-buttons">

                  {[
                    [
                      "1-10",
                      "1 - 10",
                    ],
                    [
                      "11-20",
                      "11 - 20",
                    ],
                    [
                      "21-end",
                      "21 - End",
                    ],
                    [
                      "custom",
                      "Custom",
                    ],
                  ].map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        className={
                          singlePeriodType ===
                          value
                            ? "payout-period-btn active"
                            : "payout-period-btn"
                        }
                        onClick={() =>
                          setSinglePayrollPeriod(
                            value
                          )
                        }
                      >
                        {label}
                      </button>
                    )
                  )}

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
                    value={
                      employeeId
                    }
                    onChange={(
                      event
                    ) => {
                      setEmployeeId(
                        event.target
                          .value
                      );

                      clearMessage();

                      invalidateSinglePreview();
                    }}
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
                      (
                        employee
                      ) => (
                        <option
                          key={
                            employee._id
                          }
                          value={
                            employee._id
                          }
                        >
                          {
                            employee.name
                          }
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
                    value={
                      startDate
                    }
                    onChange={(
                      event
                    ) => {
                      setStartDate(
                        event.target
                          .value
                      );

                      setSinglePeriodType(
                        "custom"
                      );

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
                    value={
                      endDate
                    }
                    onChange={(
                      event
                    ) => {
                      setEndDate(
                        event.target
                          .value
                      );

                      setSinglePeriodType(
                        "custom"
                      );

                      invalidateSinglePreview();
                    }}
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


            {/* SINGLE PREVIEW */}

            {preview && (
              <div className="payout-card payout-preview-card">

                <div className="payout-card-header">

                  <div>
                    <h2>
                      Payout Preview
                    </h2>

                    <p>
                      Review salary and
                      deductions before
                      creating payout.
                    </p>
                  </div>

                </div>


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
                      Gross Salary
                    </span>

                    <strong>
                      ₹
                      {formatMoney(
                        preview.grossSalary
                      )}
                    </strong>
                  </div>

                </div>


                <div className="payout-deduction-section">

                  <div
                    className={
                      remainingAdvance >
                      0
                        ? "payout-outstanding warning"
                        : "payout-outstanding clear"
                    }
                  >

                    <span>
                      Outstanding
                      Advance
                    </span>

                    <strong>
                      ₹
                      {formatMoney(
                        remainingAdvance
                      )}
                    </strong>

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
                        onChange={
                          handleAdvanceChange
                        }
                        className="ep-input ep-input-no-spinner"
                        disabled={
                          remainingAdvance <=
                          0
                        }
                      />

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
                          onClick={() =>
                            setAdvanceDeduction(
                              Math.min(
                                remainingAdvance,
                                grossSalary
                              )
                            )
                          }
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
                        onChange={
                          handleOtherDeductionChange
                        }
                        className="ep-input ep-input-no-spinner"
                      />

                    </div>


                    <div className="payout-field">

                      <label>
                        Payment Method
                      </label>

                      <select
                        value={
                          paymentMethod
                        }
                        onChange={(
                          event
                        ) =>
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
                      netSalary <
                        0
                    }
                  >
                    {isCreating
                      ? "Creating Payout..."
                      : "Create Payout"}
                  </button>

                </div>

              </div>
            )}

          </>
        )}


        {/* =====================================
            BULK PAYOUT
        ====================================== */}

        {payoutMode ===
          "bulk" && (
          <>

            <div className="payout-card">

              <div className="payout-card-header">

                <div>
                  <h2>
                    Bulk Payout
                  </h2>

                  <p>
                    Preview attendance and
                    salary for all eligible
                    active employees before
                    creating payouts.
                  </p>
                </div>

              </div>


              <div className="payout-period-section">

                <span className="payout-period-label">
                  Payroll Period
                </span>

                <div className="payout-period-buttons">

                  {[
                    [
                      "1-10",
                      "1 - 10",
                    ],
                    [
                      "11-20",
                      "11 - 20",
                    ],
                    [
                      "21-end",
                      "21 - End",
                    ],
                    [
                      "custom",
                      "Custom",
                    ],
                  ].map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        className={
                          bulkPeriodType ===
                          value
                            ? "payout-period-btn active"
                            : "payout-period-btn"
                        }
                        onClick={() =>
                          setBulkPayrollPeriod(
                            value
                          )
                        }
                      >
                        {label}
                      </button>
                    )
                  )}

                </div>

              </div>


              <form
                className="bulk-payout-form"
                onSubmit={
                  handleBulkPreview
                }
              >

                <div className="payout-field">

                  <label>
                    Start Date
                    <span>*</span>
                  </label>

                  <input
                    type="date"
                    value={
                      bulkStartDate
                    }
                    onChange={(
                      event
                    ) => {
                      setBulkStartDate(
                        event.target
                          .value
                      );

                      setBulkPeriodType(
                        "custom"
                      );

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
                    value={
                      bulkEndDate
                    }
                    onChange={(
                      event
                    ) => {
                      setBulkEndDate(
                        event.target
                          .value
                      );

                      setBulkPeriodType(
                        "custom"
                      );

                      invalidateBulkPreview();
                    }}
                    className="ep-input"
                  />

                </div>


                <div className="payout-field">

                  <label>
                    Default Payment Method
                  </label>

                  <select
                    value={
                      bulkDefaultPaymentMethod
                    }
                    onChange={
                      handleBulkDefaultMethodChange
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


                <div className="bulk-preview-button-wrap">

                  <button
                    type="submit"
                    className="ep-btn ep-btn-primary"
                    disabled={
                      bulkPreviewing
                    }
                  >
                    {bulkPreviewing
                      ? "Calculating All..."
                      : "Preview All Employees"}
                  </button>

                </div>

              </form>

            </div>


            {/* ===================================
                BULK PREVIEW TABLE
            ==================================== */}

            {calculatedBulkRows.length >
              0 && (
              <div className="payout-card">

                <div className="payout-card-header bulk-preview-header">

                  <div>
                    <h2>
                      Bulk Payout Preview
                    </h2>

                    <p>
                      {formatInputDisplayDate(
                        bulkStartDate
                      )}
                      {" - "}
                      {formatInputDisplayDate(
                        bulkEndDate
                      )}
                    </p>
                  </div>

                  <div className="bulk-preview-count">
                    {
                      selectedBulkRows.length
                    }{" "}
                    selected
                  </div>

                </div>


                <div className="bulk-select-bar">

                  <label>

                    <input
                      type="checkbox"
                      checked={
                        allBulkSelected
                      }
                      onChange={
                        handleBulkSelectAll
                      }
                    />

                    <span>
                      Select All Payable
                      Employees
                    </span>

                  </label>

                  <span>
                    Existing payouts are
                    locked automatically.
                  </span>

                </div>


                <div className="bulk-table-wrapper">

                  <table className="bulk-payout-table">

                    <thead>
                      <tr>

                        <th>
                          Select
                        </th>

                        <th>
                          Employee
                        </th>

                        <th>
                          Days
                        </th>

                        <th>
                          Hours
                        </th>

                        <th>
                          Gross
                        </th>

                        <th>
                          Advance Outstanding
                        </th>

                        <th>
                          Advance Cut
                        </th>

                        <th>
                          Advance Left
                        </th>

                        <th>
                          Other Ded.
                        </th>

                        <th>
                          Net Salary
                        </th>

                        <th>
                          Method
                        </th>

                      </tr>
                    </thead>


                    <tbody>

                      {calculatedBulkRows.map(
                        (row) => {

                          const locked =
                            !row.selectable;

                          const zeroSalary =
                            Number(
                              row.grossSalary ||
                                0
                            ) <= 0;

                          const maxAdvance =
                            Math.min(
                              Number(
                                row.remainingAdvance ||
                                  0
                              ),
                              Number(
                                row.grossSalary ||
                                  0
                              )
                            );

                          const maxOther =
                            Math.max(
                              0,
                              Number(
                                row.grossSalary ||
                                  0
                              ) -
                                Number(
                                  row.advanceDeducted ||
                                    0
                                )
                            );

                          return (
                            <tr
                              key={
                                row.employeeId
                              }
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
                                  checked={
                                    Boolean(
                                      row.selected
                                    )
                                  }
                                  disabled={
                                    locked
                                  }
                                  onChange={() =>
                                    handleBulkRowSelect(
                                      row.employeeId
                                    )
                                  }
                                />

                              </td>


                              <td className="bulk-employee-cell">

                                <strong>
                                  {
                                    row.employeeName
                                  }
                                </strong>

                                {row.alreadyCreated && (
                                  <span className="bulk-status-badge locked">
                                    Already Created
                                  </span>
                                )}

                                {!row.alreadyCreated &&
                                  zeroSalary && (
                                  <span className="bulk-status-badge zero">
                                    No Payable Salary
                                  </span>
                                )}

                                {row.alreadyCreated &&
                                  row.existingPayout && (
                                  <small>
                                    Existing:{" "}
                                    {formatDisplayDate(
                                      row
                                        .existingPayout
                                        .startDate
                                    )}
                                    {" - "}
                                    {formatDisplayDate(
                                      row
                                        .existingPayout
                                        .endDate
                                    )}
                                  </small>
                                )}

                              </td>


                              <td>
                                {row.totalDaysWorked ||
                                  0}
                              </td>


                              <td>
                                {row.totalHoursWorked ||
                                  0}
                                h
                              </td>


                              <td>
                                ₹
                                {formatMoney(
                                  row.grossSalary
                                )}
                              </td>


                              <td>
                                ₹
                                {formatMoney(
                                  row.remainingAdvance
                                )}
                              </td>


                              <td>

                                <div className="bulk-deduction-control">

                                  <input
                                    type="number"
                                    min={0}
                                    max={
                                      maxAdvance
                                    }
                                    value={
                                      row.advanceDeducted
                                    }
                                    disabled={
                                      locked ||
                                      maxAdvance <=
                                        0
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      handleBulkAdvanceChange(
                                        row.employeeId,
                                        event.target
                                          .value
                                      )
                                    }
                                    className="bulk-money-input"
                                  />

                                  <div className="bulk-mini-actions">

                                    <button
                                      type="button"
                                      disabled={
                                        locked
                                      }
                                      onClick={() =>
                                        handleBulkAdvanceChange(
                                          row.employeeId,
                                          "0"
                                        )
                                      }
                                    >
                                      Zero
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        locked ||
                                        maxAdvance <=
                                          0
                                      }
                                      onClick={() =>
                                        recoverFullBulkAdvance(
                                          row.employeeId
                                        )
                                      }
                                    >
                                      Full
                                    </button>

                                  </div>

                                </div>

                              </td>


                              <td className="bulk-advance-left">
                                ₹
                                {formatMoney(
                                  row.calculatedAdvanceLeft
                                )}
                              </td>


                              <td>

                                <input
                                  type="number"
                                  min={0}
                                  max={
                                    maxOther
                                  }
                                  value={
                                    row.otherDeduction
                                  }
                                  disabled={
                                    locked
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleBulkOtherDeductionChange(
                                      row.employeeId,
                                      event.target
                                        .value
                                    )
                                  }
                                  className="bulk-money-input"
                                />

                              </td>


                              <td className="bulk-net-value">
                                ₹
                                {formatMoney(
                                  row.calculatedNet
                                )}
                              </td>


                              <td>

                                <select
                                  value={
                                    row.paymentMethod ||
                                    bulkDefaultPaymentMethod
                                  }
                                  disabled={
                                    locked
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleBulkMethodChange(
                                      row.employeeId,
                                      event.target
                                        .value
                                    )
                                  }
                                  className="bulk-method-select"
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

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>


                {/* =================================
                    BULK SUMMARY
                ================================== */}

                <div className="bulk-summary">

                  <div className="bulk-summary-grid">

                    <div>
                      <span>
                        Employees Selected
                      </span>

                      <strong>
                        {
                          bulkTotals.employeeCount
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        Total Gross
                      </span>

                      <strong>
                        ₹
                        {formatMoney(
                          bulkTotals.grossSalary
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Advance Recovery
                      </span>

                      <strong>
                        ₹
                        {formatMoney(
                          bulkTotals.advanceDeduction
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Other Deduction
                      </span>

                      <strong>
                        ₹
                        {formatMoney(
                          bulkTotals.otherDeduction
                        )}
                      </strong>
                    </div>


                    <div className="bulk-summary-net">
                      <span>
                        Total Net Payout
                      </span>

                      <strong>
                        ₹
                        {formatMoney(
                          bulkTotals.netSalary
                        )}
                      </strong>
                    </div>

                  </div>


                  <button
                    type="button"
                    className="ep-btn ep-btn-primary bulk-create-btn"
                    disabled={
                      bulkCreating ||
                      selectedBulkRows.length ===
                        0
                    }
                    onClick={
                      handleBulkCreate
                    }
                  >
                    {bulkCreating
                      ? "Creating Payouts..."
                      : `Create ${selectedBulkRows.length} Payout${
                          selectedBulkRows.length ===
                          1
                            ? ""
                            : "s"
                        }`}
                  </button>

                </div>

              </div>
            )}


            {/* ===================================
                BULK RESULT
            ==================================== */}

            {bulkResult && (
              <div className="payout-card bulk-result-card">

                <div className="payout-card-header">

                  <div>
                    <h2>
                      Bulk Payout Result
                    </h2>

                    <p>
                      Creation results for
                      the latest bulk payout.
                    </p>
                  </div>

                </div>


                <div className="bulk-result-summary">

                  <div className="bulk-result-success">

                    <strong>
                      ✓{" "}
                      {bulkResult.created
                        ?.length ||
                        0}
                    </strong>

                    <span>
                      Created
                      Successfully
                    </span>

                  </div>


                  <div className="bulk-result-failed">

                    <strong>
                      ✕{" "}
                      {bulkResult.failed
                        ?.length ||
                        0}
                    </strong>

                    <span>
                      Failed
                    </span>

                  </div>

                </div>


                {bulkResult.created
                  ?.length > 0 && (
                  <div className="bulk-result-list">

                    <h3>
                      Successfully
                      Created
                    </h3>

                    {bulkResult.created.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item._id ||
                            index
                          }
                          className="bulk-result-item success"
                        >
                          <span>
                            ✓{" "}
                            {item.employeeName ||
                              "Employee"}
                          </span>

                          <strong>
                            ₹
                            {formatMoney(
                              item.netSalary
                            )}
                          </strong>
                        </div>
                      )
                    )}

                  </div>
                )}


                {bulkResult.failed
                  ?.length > 0 && (
                  <div className="bulk-result-list">

                    <h3>
                      Failed
                    </h3>

                    {bulkResult.failed.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            `${item.employeeId}-${index}`
                          }
                          className="bulk-result-item failed"
                        >
                          <span>
                            ✕{" "}
                            {item.employeeName ||
                              "Employee"}
                          </span>

                          <small>
                            {item.message}
                          </small>
                        </div>
                      )
                    )}

                  </div>
                )}


                {bulkResult.created
                  ?.length > 0 && (
                  <div className="bulk-print-action">

                    <button
                      type="button"
                      className="ep-btn ep-btn-primary"
                      onClick={
                        handlePrintBulk
                      }
                    >
                      Print Successfully Created Payouts
                    </button>

                  </div>
                )}

              </div>
            )}

          </>
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


          <div className="payout-filters">

            <div className="payout-field">

              <label>
                Employee Name
              </label>

              <input
                type="text"
                placeholder="Search employee"
                value={
                  searchName
                }
                onChange={(
                  event
                ) =>
                  setSearchName(
                    event.target
                      .value
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
                value={
                  searchDate
                }
                onChange={(
                  event
                ) =>
                  setSearchDate(
                    event.target
                      .value
                  )
                }
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
              Loading payout
              records...
            </div>
          ) : filteredPayouts.length ===
            0 ? (
            <div className="payout-state">
              No payout records
              found.
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
                          {payout.overtimeHours ||
                            0}
                          h
                          <br />
                          ₹
                          {formatMoney(
                            payout.overtimeAmount
                          )}
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
                                  event.target
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


      {/* ====================================================
          PRINT-ONLY BULK PAYOUT SHEET
      ==================================================== */}

      {bulkPrintPages.length >
        0 && (
        <div className="bulk-print-root">

          {bulkPrintPages.map(
            (
              pageRows,
              pageIndex
            ) => (
              <section
                className="bulk-print-page"
                key={
                  pageIndex
                }
              >

                <div className="bulk-print-company">
                  NEW CALCUTTA HANDLOOM
                </div>


                <div className="bulk-print-info">

                  <div>
                    <strong>
                      Payout Duration:
                    </strong>{" "}
                    {formatInputDisplayDate(
                      bulkStartDate
                    )}{" "}
                    -{" "}
                    {formatInputDisplayDate(
                      bulkEndDate
                    )}
                  </div>

                  <div>
                    <strong>
                      Payout Created:
                    </strong>{" "}
                    {bulkCreatedAt
                      ? bulkCreatedAt.toLocaleDateString(
                          "en-IN"
                        )
                      : "-"}
                  </div>

                </div>


                <table className="bulk-print-table">

                  <thead>
                    <tr>

                      <th>
                        S.No
                      </th>

                      <th>
                        Employee Name
                      </th>

                      <th>
                        Days
                      </th>

                      <th>
                        Hours
                      </th>

                      <th>
                        Advance Left
                      </th>

                      <th>
                        Advance Cut
                      </th>

                      <th>
                        Other Ded.
                      </th>

                      <th>
                        Net Salary
                      </th>

                      <th>
                        Signature
                      </th>

                    </tr>
                  </thead>


                  <tbody>

                    {pageRows.map(
                      (
                        payout,
                        rowIndex
                      ) => (
                        <tr
                          key={
                            payout._id ||
                            rowIndex
                          }
                        >

                          <td>
                            {pageIndex *
                              12 +
                              rowIndex +
                              1}
                          </td>


                          <td className="bulk-print-name">
                            {payout.employeeName ||
                              "-"}
                          </td>


                          <td>
                            {payout.totalDaysWorked ||
                              0}
                          </td>


                          <td>
                            {payout.totalHoursWorked ||
                              0}
                          </td>


                          <td>
                            ₹
                            {formatMoney(
                              payout.outstandingAdvanceAfter
                            )}
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


                          <td className="bulk-print-net">
                            ₹
                            {formatMoney(
                              payout.netSalary
                            )}
                          </td>


                          <td className="bulk-print-signature">
                            &nbsp;
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>


                {pageIndex ===
                  bulkPrintPages.length -
                    1 && (
                  <div className="bulk-print-summary">

                    <span>
                      Employees Paid:{" "}
                      <strong>
                        {bulkResult
                          ?.created
                          ?.length ||
                          0}
                      </strong>
                    </span>


                    <span>
                      Advance Cut:{" "}
                      <strong>
                        ₹
                        {formatMoney(
                          bulkResult
                            ?.summary
                            ?.totalAdvanceDeducted
                        )}
                      </strong>
                    </span>


                    <span>
                      Other Deduction:{" "}
                      <strong>
                        ₹
                        {formatMoney(
                          bulkResult
                            ?.summary
                            ?.totalOtherDeduction
                        )}
                      </strong>
                    </span>


                    <span>
                      Net Payout:{" "}
                      <strong>
                        ₹
                        {formatMoney(
                          bulkResult
                            ?.summary
                            ?.totalNetSalary
                        )}
                      </strong>
                    </span>

                  </div>
                )}


                <div className="bulk-print-page-number">
                  Page{" "}
                  {pageIndex + 1} of{" "}
                  {bulkPrintPages.length}
                </div>

              </section>
            )
          )}

        </div>
      )}

    </>
  );
};


export default PayoutPage;