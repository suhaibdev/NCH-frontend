import React from "react";
import { formatBusinessDate } from "../../utils/businessDate";

const sizeLabel = (size) =>
  size?.lengthValue && size?.widthValue
    ? `${size.lengthValue} ${size.lengthUnit} × ${size.widthValue} ${size.widthUnit}`
    : "Not applicable";

const materialTitle = (material) => {
  if (material.stockTypeName?.toLowerCase() === "label") return "Label Used";
  if (material.category === "washed_raw_material") return "Washed Raw Material Used";
  return "Additional Material";
};

const entrySizeLabel = (entry) => {
  const sizes = [
    ...new Set(
      (entry.materials || [])
        .filter((material) => material.size?.lengthValue && material.size?.widthValue)
        .map((material) => sizeLabel(material.size))
    ),
  ];
  return sizes.length ? sizes.join(", ") : "Not applicable";
};

const ManufacturingHistoryDetail = ({ entry, renderActions }) => (
  <div className="manufacturing-history-detail">
    <dl className="manufacturing-history-meta">
      <div>
        <dt>Batch No.</dt>
        <dd>{entry.batchNumber || "Not recorded for this legacy entry"}</dd>
      </div>
      <div>
        <dt>Manufacturing Date</dt>
        <dd>{formatBusinessDate(entry.manufacturingDate)}</dd>
      </div>
      <div>
        <dt>Finished Product</dt>
        <dd>{entry.output?.finishedStockItemName || entry.finishedProductName || "—"}</dd>
      </div>
      <div>
        <dt>Finished Quantity</dt>
        <dd>
          {entry.output?.quantityProduced || entry.quantityManufactured || 0}{" "}
          {(entry.output?.unit || entry.finishedUnit || "").toUpperCase()}
        </dd>
      </div>
      <div>
        <dt>Size</dt>
        <dd>{entrySizeLabel(entry)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{entry.status === "reversed" ? "Reversed" : "Completed"}</dd>
      </div>
    </dl>

    <section className="manufacturing-history-materials">
      <h3>Materials Used</h3>
      <div>
        {(entry.materials || []).map((material, index) => (
          <article key={`${material.item || material.productName}-${index}`}>
            <strong>{materialTitle(material)}</strong>
            <span>{material.productName || "—"}</span>
            <span>
              {material.quantityUsed || 0} {(material.unit || "").toUpperCase()} used
              {Number(material.wastage) > 0 &&
                ` · ${material.wastage} ${(material.unit || "").toUpperCase()} wastage included`}
            </span>
            <span>Supplier: {material.supplierName || "Not applicable"}</span>
            <span>Size: {sizeLabel(material.size)}</span>
          </article>
        ))}
      </div>
    </section>

    {entry.notes && <p className="manufacturing-history-notes">Notes: {entry.notes}</p>}
    {entry.status === "reversed" && (
      <p className="manufacturing-reversed">
        Reversed on {formatBusinessDate(entry.reversedAt)}:{" "}
        {entry.reverseReason || "No reason recorded."}
      </p>
    )}
    {renderActions?.(entry)}
  </div>
);

const ManufacturingHistoryTable = ({ items, expandedId, onToggle, renderExpandedActions }) => (
  <div className="manufacturing-table-scroll">
    <table className="manufacturing-table manufacturing-history-table">
      <thead>
        <tr>
          <th>Batch No.</th>
          <th>Date</th>
          <th>Finished Product</th>
          <th>Size</th>
          <th>Qty</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((entry) => {
          const isExpanded = expandedId === entry._id;
          const toggle = () => onToggle(entry._id);

          return (
            <React.Fragment key={entry._id}>
              <tr
                className={`manufacturing-history-row${isExpanded ? " is-expanded" : ""}`}
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle();
                  }
                }}
              >
                <td>{entry.batchNumber || "Legacy record"}</td>
                <td>{formatBusinessDate(entry.manufacturingDate)}</td>
                <td>{entry.output?.finishedStockItemName || entry.finishedProductName || "—"}</td>
                <td>{entrySizeLabel(entry)}</td>
                <td>
                  {entry.output?.quantityProduced || entry.quantityManufactured || 0}{" "}
                  {(entry.output?.unit || entry.finishedUnit || "").toUpperCase()}
                </td>
                <td>
                  <span className={`manufacturing-status ${entry.status}`}>
                    {entry.status === "reversed" ? "Reversed" : "Completed"}
                  </span>
                </td>
              </tr>
              {isExpanded && (
                <tr className="manufacturing-history-expanded-row">
                  <td colSpan="6">
                    <ManufacturingHistoryDetail
                      entry={entry}
                      renderActions={renderExpandedActions}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default ManufacturingHistoryTable;
