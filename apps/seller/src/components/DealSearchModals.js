import React from "react";
import { DealSortModal, DealFilterModal } from "@dealsworld/shared";
import { SORT_FIELDS, FILTER_FIELDS } from "../hooks/useDealSearchControls";

// The Sort/Filter bottom sheets opened from the seller dashboard header.
// One instance per screen, driven entirely by that screen's own
// useDealSearchControls() result.
export default function DealSearchModals({ controls, resultCount }) {
  return (
    <>
      <DealSortModal
        visible={controls.isSortVisible}
        onClose={() => controls.setIsSortVisible(false)}
        fields={SORT_FIELDS}
        selectedField={controls.sortField}
        onSelectField={controls.handleSelectSortField}
        sortOrder={controls.sortOrder}
        onSortOrderChange={controls.setSortOrder}
        onClear={controls.handleClearSort}
      />

      <DealFilterModal
        visible={controls.isFilterVisible}
        onClose={() => controls.setIsFilterVisible(false)}
        fields={FILTER_FIELDS}
        selectedField={controls.filterField}
        onSelectField={controls.handleSelectFilterField}
        filterQuery={controls.filterQuery}
        onFilterQueryChange={controls.setFilterQuery}
        canAddRule={controls.canAddFilterRule}
        onAddRule={controls.handleAddFilterRule}
        rules={controls.filterRules}
        onRemoveRule={controls.handleRemoveFilterRule}
        onClearAll={controls.handleClearAllFilters}
        onApply={controls.handleApplyFilters}
        resultCount={resultCount || 0}
      />
    </>
  );
}
