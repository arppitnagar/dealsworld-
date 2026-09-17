import { useState } from "react";
import {
  DEAL_SORT_FIELDS,
  DEAL_FILTER_FIELDS,
  normalizeDealFilterText,
  applyDealFieldFilters,
  sortDealsByField,
} from "@dealsworld/shared";

export const SORT_FIELDS = DEAL_SORT_FIELDS;
export const FILTER_FIELDS = DEAL_FILTER_FIELDS;

// Search text + field sort/filter state, shared by Home and the Deals tab so
// both screens' headers behave identically - only what feeds into them
// (which base list of deals) differs per screen.
export function useDealSearchControls() {
  const [searchText, setSearchText] = useState("");
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterRules, setFilterRules] = useState([]);
  const [filterField, setFilterField] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");

  const isSearching = searchText.trim().length > 0;
  const canAddFilterRule = Boolean(filterField && filterQuery.trim().length > 0);
  const hasFieldFilter = filterRules.length > 0;

  const handleSelectSortField = (field) => {
    setSortField(field);
    setIsSortVisible(false);
  };

  const handleClearSort = () => {
    setSortField(null);
    setSortOrder("asc");
    setIsSortVisible(false);
  };

  const handleSelectFilterField = (field) => {
    setFilterField(field);
  };

  const handleAddFilterRule = () => {
    if (!canAddFilterRule) return;
    const normalizedQuery = filterQuery.trim();
    const nextRule = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      field: filterField,
      query: normalizedQuery,
      mode: "contains",
    };
    setFilterRules((prev) => {
      const duplicate = prev.some(
        (rule) =>
          rule.field === nextRule.field &&
          rule.mode === nextRule.mode &&
          normalizeDealFilterText(rule.query) ===
            normalizeDealFilterText(nextRule.query),
      );
      return duplicate ? prev : [...prev, nextRule];
    });
    setFilterQuery("");
  };

  const handleRemoveFilterRule = (ruleId) => {
    setFilterRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const handleApplyFilters = () => {
    if (canAddFilterRule) {
      handleAddFilterRule();
    }
    setIsFilterVisible(false);
  };

  const handleClearAllFilters = () => {
    setFilterRules([]);
    setFilterField(null);
    setFilterQuery("");
    setIsFilterVisible(false);
  };

  // Narrows by the saved field-filter rules, then applies the chosen sort -
  // the same two-step pipeline both screens ran inline before.
  const applyFieldFilterAndSort = (deals) => {
    const fieldFiltered =
      deals?.length && filterRules.length
        ? applyDealFieldFilters(deals, filterRules)
        : deals;
    return fieldFiltered?.length && sortField
      ? sortDealsByField(fieldFiltered, sortField, sortOrder)
      : fieldFiltered;
  };

  return {
    searchText,
    setSearchText,
    isSearching,
    isSortVisible,
    setIsSortVisible,
    sortField,
    sortOrder,
    setSortOrder,
    handleSelectSortField,
    handleClearSort,
    isFilterVisible,
    setIsFilterVisible,
    filterRules,
    filterField,
    filterQuery,
    setFilterQuery,
    canAddFilterRule,
    hasFieldFilter,
    handleSelectFilterField,
    handleAddFilterRule,
    handleRemoveFilterRule,
    handleApplyFilters,
    handleClearAllFilters,
    applyFieldFilterAndSort,
  };
}
