'use client';

import React from 'react';

/**
 * Standard configuration for document pagination
 */
export const DOC_PAGINATION_CONFIG = {
  facture: { itemsFirstPage: 8, itemsPerPage: 14 },
  devis: { itemsFirstPage: 9, itemsPerPage: 15 },
  recu: { itemsFirstPage: 10, itemsPerPage: 16 },
  bon_de_commande: { itemsFirstPage: 9, itemsPerPage: 15 },
};

export interface PaginationConfig {
  itemsFirstPage: number;
  itemsPerPage: number;
}

/**
 * Hook to split items into pages based on dynamic limits
 */
export function useDocumentPagination<T>(items: T[], config: PaginationConfig) {
  const pages = React.useMemo(() => {
    if (!items || items.length === 0) return [[]];

    const result: T[][] = [];
    
    // Page 1
    const firstPageItems = items.slice(0, config.itemsFirstPage);
    result.push(firstPageItems);

    // Subsequent pages
    let remaining = items.slice(config.itemsFirstPage);
    while (remaining.length > 0) {
      result.push(remaining.slice(0, config.itemsPerPage));
      remaining = remaining.slice(config.itemsPerPage);
    }

    return result;
  }, [items, config.itemsFirstPage, config.itemsPerPage]);

  return {
    pages,
    totalPages: pages.length,
  };
}

/**
 * Component to display page number
 */
export function PageBadge({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="text-[10px] text-gray-400 font-medium">
      Page {pageNumber} / {totalPages}
    </div>
  );
}

/**
 * Wrapper component for document pages
 */
interface DocumentPagesProps<T> {
  items: T[];
  config: PaginationConfig;
  renderPage: (pageItems: T[], context: { pageNumber: number; totalPages: number; isFirstPage: boolean; isLastPage: boolean }) => React.ReactNode;
}

export function DocumentPages<T>({ items, config, renderPage }: DocumentPagesProps<T>) {
  const { pages, totalPages } = useDocumentPagination(items, config);

  return (
    <div className="document-container">
      {pages.map((pageItems, index) => {
        const pageNumber = index + 1;
        const isFirstPage = pageNumber === 1;
        const isLastPage = pageNumber === totalPages;

        return (
          <div 
            key={index} 
            className={`print-page ${!isLastPage ? 'page-break' : ''}`}
            style={{
              width: '210mm',
              minHeight: '297mm',
              margin: '0 auto',
              backgroundColor: 'white',
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
            {renderPage(pageItems, { pageNumber, totalPages, isFirstPage, isLastPage })}
          </div>
        );
      })}
      
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .document-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important; /* Force exact A4 height in print */
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
