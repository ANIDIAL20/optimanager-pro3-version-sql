import { StyleSheet, Font } from '@react-pdf/renderer';

// Define common styles that mimic the print template
export const pdfStyles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 9,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
        color: '#0f172a', // slate-900
    },
    // Layout Helpers
    row: {
        flexDirection: 'row',
    },
    col: {
        flexDirection: 'column',
    },
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 1.5,
        borderBottomColor: '#cbd5e1', // slate-300
    },
    headerLeft: {
        flexDirection: 'row',
        gap: 15,
        width: '60%',
    },
    logoContainer: {
        width: 100,
        height: 80,
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    shopInfo: {
        justifyContent: 'center',
    },
    shopName: {
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    shopDetail: {
        fontSize: 8,
        color: '#475569', // slate-600
        marginBottom: 1,
    },
    legalRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    legalText: {
        fontSize: 7,
        color: '#64748b', // slate-500
    },

    // Header Right (Doc Meta)
    headerRight: {
        alignItems: 'flex-end',
        width: '35%',
    },
    docBadge: {
        backgroundColor: '#0f172a', // slate-900
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 2,
        marginBottom: 10,
    },
    docTitle: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    docMetaItem: {
        fontSize: 8,
        marginBottom: 2,
        color: '#475569', // slate-600
    },
    docMetaValue: {
        color: '#0f172a', // slate-900
        fontWeight: 'bold',
    },

    // Client Section
    clientContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 25,
    },
    clientBox: {
        width: '55%',
        padding: 12,
        backgroundColor: '#f8fafc', // slate-50
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
        borderRadius: 4,
    },
    clientLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#64748b', // slate-500
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    clientName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    clientDetail: {
        fontSize: 8,
        color: '#475569', // slate-600
        marginBottom: 1,
    },

    // Table
    table: {
        width: 'auto',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#0f172a', // slate-900
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    th: {
        color: '#ffffff',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9', // slate-100
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    // Column widths
    colDesc: { width: '45%' },
    colBrand: { width: '15%' },
    colModel: { width: '15%' },
    colQty: { width: '8%', textAlign: 'center' },
    colPrice: { width: '12%', textAlign: 'right' },
    // Removed colTotal from here, handling in components if needed, or keeping standardized

    // Totals Section
    totalsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 25,
    },
    totalsBox: {
        width: '45%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    totalLabel: {
        fontSize: 8,
        color: '#475569', // slate-600
    },
    totalValue: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    totalTTCBox: {
        backgroundColor: '#0f172a', // slate-900
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        marginTop: 6,
        borderRadius: 2,
    },
    totalTTCLabel: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    totalTTCValue: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Amount in Words
    wordsContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f8fafc', // slate-50
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
        borderRadius: 4,
    },
    wordsLabel: {
        fontSize: 7,
        color: '#64748b', // slate-600
        marginBottom: 2,
    },
    wordsValue: {
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#0f172a',
    },

    // Payment Methods
    paymentMethodsContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
    },
    paymentMethodsLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#334155', // slate-700
        marginBottom: 4,
    },
    paymentMethodsList: {
        fontSize: 8,
        color: '#475569', // slate-600
    },

    // Signatures
    signaturesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        gap: 20,
    },
    signatureBox: {
        width: '48%',
        height: 60,
        borderWidth: 1,
        borderColor: '#cbd5e1', // slate-300
        borderStyle: 'dashed',
        borderRadius: 4,
        padding: 10,
    },
    signatureLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#64748b', // slate-500
        marginBottom: 2,
    },
    signatureSubLabel: {
        fontSize: 6,
        color: '#94a3b8', // slate-400
        fontStyle: 'italic',
    },

    // Payment Info / Conditions
    footerSection: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    footerCol: {
        width: '48%',
    },
    footerLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#334155', // slate-700
        marginBottom: 2,
    },
    footerText: {
        fontSize: 7,
        color: '#64748b', // slate-500
        lineHeight: 1.3,
    },
    pagination: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 7,
        color: '#94a3b8',
    },
});
