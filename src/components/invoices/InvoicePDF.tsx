import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image as PDFImage,
    Font,
} from '@react-pdf/renderer';
import type { Sale, Client } from '@/lib/types';

// Define types for shop settings
interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
}

interface InvoicePDFProps {
    sale: Sale;
    client: Client;
    shopSettings: ShopSettings;
}

// Register fonts (optional - using default Helvetica)
// You can add custom fonts here if needed

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    // Header Section
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottom: '2 solid #e2e8f0',
    },
    logoSection: {
        width: '40%',
    },
    logo: {
        width: 120,
        height: 120,
        objectFit: 'contain',
    },
    shopDetailsSection: {
        width: '55%',
        textAlign: 'right',
    },
    shopName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    shopDetail: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 3,
    },
    // Invoice Title
    invoiceTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Invoice Info Bar
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
    },
    infoItem: {
        flexDirection: 'column',
    },
    infoLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: 11,
        color: '#1e293b',
        fontWeight: 'bold',
    },
    // Client Section
    clientSection: {
        marginBottom: 25,
        padding: 15,
        backgroundColor: '#f1f5f9',
        borderLeft: '4 solid #3b82f6',
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    clientDetail: {
        fontSize: 10,
        color: '#475569',
        marginBottom: 3,
    },
    // Table
    table: {
        marginBottom: 25,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        padding: 10,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottom: '1 solid #e2e8f0',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    colDescription: {
        width: '50%',
    },
    colQty: {
        width: '15%',
        textAlign: 'center',
    },
    colPrice: {
        width: '17.5%',
        textAlign: 'right',
    },
    colTotal: {
        width: '17.5%',
        textAlign: 'right',
    },
    // Totals Section
    totalsSection: {
        marginLeft: 'auto',
        width: '50%',
        marginBottom: 30,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 8,
        borderBottom: '1 solid #e2e8f0',
    },
    totalLabel: {
        fontSize: 10,
        color: '#64748b',
    },
    totalValue: {
        fontSize: 10,
        color: '#1e293b',
        fontWeight: 'bold',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#1e293b',
        marginTop: 5,
    },
    grandTotalLabel: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    grandTotalValue: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    // Footer
    footer: {
        marginTop: 'auto',
        paddingTop: 20,
        borderTop: '2 solid #e2e8f0',
    },
    footerText: {
        fontSize: 8,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 3,
    },
    footerBold: {
        fontWeight: 'bold',
        color: '#1e293b',
    },
    // Notes
    notesSection: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#fef3c7',
        borderRadius: 4,
    },
    notesTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: 5,
    },
    notesText: {
        fontSize: 8,
        color: '#78350f',
        lineHeight: 1.4,
    },
});

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ sale, client, shopSettings }) => {
    // Calculate items (this is simplified - adjust based on your sale structure)
    const items = sale.items || [];
    const subtotal = sale.totalNet || 0;
    const discount = 0; // Discount can be added later
    const tva = 0; // Add TVA calculation if needed
    const total = sale.totalNet || subtotal;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header with Logo and Shop Details */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        {shopSettings.logoUrl ? (
                            <PDFImage src={shopSettings.logoUrl} style={styles.logo} />
                        ) : (
                            <Text style={styles.shopName}>{shopSettings.shopName}</Text>
                        )}
                    </View>
                    <View style={styles.shopDetailsSection}>
                        <Text style={styles.shopName}>{shopSettings.shopName}</Text>
                        {shopSettings.address && (
                            <Text style={styles.shopDetail}>{shopSettings.address}</Text>
                        )}
                        {shopSettings.phone && (
                            <Text style={styles.shopDetail}>Tél: {shopSettings.phone}</Text>
                        )}
                        {shopSettings.ice && (
                            <Text style={styles.shopDetail}>ICE: {shopSettings.ice}</Text>
                        )}
                    </View>
                </View>

                {/* Invoice Title */}
                <Text style={styles.invoiceTitle}>Facture</Text>

                {/* Invoice Info Bar */}
                <View style={styles.infoBar}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Numéro de Facture</Text>
                        <Text style={styles.infoValue}>#{sale.id?.substring(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                            {sale.date ? new Date(sale.date).toLocaleDateString('fr-FR') : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Statut</Text>
                        <Text style={styles.infoValue}>
                            {sale.resteAPayer === 0 ? 'Payée' : 'En attente'}
                        </Text>
                    </View>
                </View>

                {/* Client Information */}
                <View style={styles.clientSection}>
                    <Text style={styles.sectionTitle}>Informations Client</Text>
                    <Text style={styles.clientDetail}>
                        {client.prenom} {client.nom}
                    </Text>
                    {client.telephone1 && (
                        <Text style={styles.clientDetail}>Tél: {client.telephone1}</Text>
                    )}
                    {client.ville && (
                        <Text style={styles.clientDetail}>Ville: {client.ville}</Text>
                    )}
                    {client.email && (
                        <Text style={styles.clientDetail}>Email: {client.email}</Text>
                    )}
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDescription}>Description</Text>
                        <Text style={styles.colQty}>Qté</Text>
                        <Text style={styles.colPrice}>Prix Unit.</Text>
                        <Text style={styles.colTotal}>Total</Text>
                    </View>

                    {/* Table Rows - Simplified, adjust based on your data structure */}
                    <View style={[styles.tableRow, styles.tableRowAlt]}>
                        <Text style={styles.colDescription}>
                            Produits
                        </Text>
                        <Text style={styles.colQty}>1</Text>
                        <Text style={styles.colPrice}>{subtotal.toFixed(2)} MAD</Text>
                        <Text style={styles.colTotal}>{subtotal.toFixed(2)} MAD</Text>
                    </View>
                </View>

                {/* Totals Section */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Sous-total HT</Text>
                        <Text style={styles.totalValue}>{subtotal.toFixed(2)} MAD</Text>
                    </View>
                    {discount > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Remise</Text>
                            <Text style={styles.totalValue}>-{discount.toFixed(2)} MAD</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TVA (0%)</Text>
                        <Text style={styles.totalValue}>{tva.toFixed(2)} MAD</Text>
                    </View>
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>TOTAL TTC</Text>
                        <Text style={styles.grandTotalValue}>{total.toFixed(2)} MAD</Text>
                    </View>
                </View>

                {/* Payment Info */}
                {sale.resteAPayer > 0 && (
                    <View style={styles.notesSection}>
                        <Text style={styles.notesTitle}>Information de Paiement</Text>
                        <Text style={styles.notesText}>
                            Montant Payé: {(sale.totalPaye || 0).toFixed(2)} MAD
                        </Text>
                        <Text style={styles.notesText}>
                            Reste à Payer: {sale.resteAPayer.toFixed(2)} MAD
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        <Text style={styles.footerBold}>Merci pour votre confiance!</Text>
                    </Text>
                    {shopSettings.rib && (
                        <Text style={styles.footerText}>RIB: {shopSettings.rib}</Text>
                    )}
                    {shopSettings.ice && (
                        <Text style={styles.footerText}>ICE: {shopSettings.ice}</Text>
                    )}
                    <Text style={styles.footerText}>
                        Document généré le {new Date().toLocaleDateString('fr-FR')}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
