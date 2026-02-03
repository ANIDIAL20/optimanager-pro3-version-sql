import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image as PDFImage,
} from '@react-pdf/renderer';
import type { Devis } from '@/app/actions/devis-actions';
import type { Client } from '@/lib/types';

// Reuse InvoicePDF styles for consistency
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
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
    invoiceTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
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

interface ShopSettings {
    shopName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    ice?: string;
    rib?: string;
}

interface QuotePDFProps {
    devis: Devis;
    shopSettings: ShopSettings;
    // client info is inside devis or fetched separately?
    // Devis stored clientName/Phone but full client details might be needed.
    // We will use devis fields locally.
    client?: Client; 
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ devis, shopSettings, client }) => {
    // Determine data
    const items = devis.items || [];
    const totalHT =  devis.totalHT || items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
    const totalTTC = devis.totalTTC || totalHT * 1.2; // fallback
    const tva = totalTTC - totalHT;

    const formattedDate = devis.createdAt ? new Date(devis.createdAt).toLocaleDateString('fr-FR') : 'N/A';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                 {/* Header */}
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
                        {shopSettings.address && <Text style={styles.shopDetail}>{shopSettings.address}</Text>}
                        {shopSettings.phone && <Text style={styles.shopDetail}>Tél: {shopSettings.phone}</Text>}
                        {shopSettings.ice && <Text style={styles.shopDetail}>ICE: {shopSettings.ice}</Text>}
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.invoiceTitle}>DEVIS</Text>

                {/* Info Bar */}
                <View style={styles.infoBar}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Numéro</Text>
                        <Text style={styles.infoValue}>#{devis.id?.substring(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{formattedDate}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Validité</Text>
                        <Text style={styles.infoValue}>15 Jours</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Statut</Text>
                        <Text style={styles.infoValue}>{devis.status}</Text>
                    </View>
                </View>

                {/* Client Info */}
                <View style={styles.clientSection}>
                    <Text style={styles.sectionTitle}>Client</Text>
                    <Text style={styles.clientDetail}>{devis.clientName}</Text>
                    {devis.clientPhone && <Text style={styles.clientDetail}>Tél: {devis.clientPhone}</Text>}
                    {/* If full client object passed, show more */}
                    {client?.adresse && <Text style={styles.clientDetail}>{client.adresse}</Text>}
                    {client?.ville && <Text style={styles.clientDetail}>{client.ville}</Text>}
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDescription}>Désignation</Text>
                        <Text style={styles.colQty}>Qté</Text>
                        <Text style={styles.colPrice}>Prix U.</Text>
                        <Text style={styles.colTotal}>Total</Text>
                    </View>

                    {items.map((item, idx) => (
                        <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                            <Text style={styles.colDescription}>{item.designation}</Text>
                            <Text style={styles.colQty}>{item.quantite}</Text>
                            <Text style={styles.colPrice}>{Number(item.prixUnitaire).toFixed(2)}</Text>
                            <Text style={styles.colTotal}>{(item.quantite * item.prixUnitaire).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                     <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total HT</Text>
                        <Text style={styles.totalValue}>{Number(totalHT).toFixed(2)} MAD</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TVA (20%)</Text>
                        <Text style={styles.totalValue}>{Number(tva).toFixed(2)} MAD</Text>
                    </View>
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>TOTAL TTC</Text>
                        <Text style={styles.grandTotalValue}>{Number(totalTTC).toFixed(2)} MAD</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                     <Text style={styles.footerText}>
                        <Text style={styles.footerBold}>Merci de votre confiance!</Text>
                    </Text>
                     <Text style={styles.footerText}>Devis valable 15 jours</Text>
                     {shopSettings.rib && <Text style={styles.footerText}>RIB: {shopSettings.rib}</Text>}
                     {shopSettings.ice && <Text style={styles.footerText}>ICE: {shopSettings.ice}</Text>}
                </View>
            </Page>
        </Document>
    );
};
