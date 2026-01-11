
import type { Client, Order, Product, Assurance, Category, Material, Color } from "./types";
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const clients: Client[] = [
  {
    id: "cl-001",
    nom: "Dupont",
    prenom: "Jean",
    telephone1: "0612345678",
    assuranceId: "ass-mutuelle-generale",
  },
  {
    id: "cl-002",
    nom: "Martin",
    prenom: "Marie",
    telephone1: "0687654321",
    assuranceId: "ass-allianz",
  },
];

export const products: Product[] = [
  {
    id: "prod-001",
    reference: "RB2140",
    nomProduit: "Ray-Ban Wayfarer",
    prixAchat: 80,
    prixVente: 150,
    quantiteStock: 18,
    stockMin: 5,
    categorieId: "cat-solaires",
    marqueId: "ray-ban",
    couleurId: "clr-noir",
    matiereId: "acetate",
    imageUrl: findImage("product1")?.imageUrl,
    imageHint: findImage("product1")?.imageHint,
  },
  {
    id: "prod-002",
    reference: "OAK-9102",
    nomProduit: "Oakley Holbrook",
    prixAchat: 100,
    prixVente: 180,
    quantiteStock: 8,
    stockMin: 3,
    categorieId: "cat-solaires",
    marqueId: "oakley",
    couleurId: "clr-gris",
    matiereId: 'plastique',
    imageUrl: findImage("product2")?.imageUrl,
    imageHint: findImage("product2")?.imageHint,
  },
  {
    id: "prod-003",
    reference: "PRS-01V",
    nomProduit: "Prada PR 01V",
    prixAchat: 150,
    prixVente: 250,
    quantiteStock: 25,
    stockMin: 5,
    categorieId: "cat-optiques",
    marqueId: "prada",
    couleurId: "clr-ecaille",
    matiereId: 'acetate',
    imageUrl: findImage("product3")?.imageUrl,
    imageHint: findImage("product3")?.imageHint,
  },
  {
    id: "prod-004",
    reference: "ACV-OASYS",
    nomProduit: "Acuvue Oasys 1-Day",
    prixAchat: 25,
    prixVente: 45,
    quantiteStock: 5,
    stockMin: 10,
    categorieId: "cat-lentilles",
    marqueId: "acuvue",
    couleurId: "clr-transparent",
    matiereId: 'silicone-hydrogel',
    imageUrl: findImage("product4")?.imageUrl,
    imageHint: findImage("product4")?.imageHint,
  },
];

export const orders: Order[] = [
  {
    id: "cmd-001",
    client_id: "cl-001",
    client_nom: "Jean Dupont",
    utilisateur_id: "user-01",
    date_creation: "2024-05-10",
    total: 350,
    statut: "Confirmée",
  },
  {
    id: "cmd-002",
    client_id: "cl-002",
    client_nom: "Marie Martin",
    utilisateur_id: "user-02",
    date_creation: "2024-05-12",
    total: 180,
    statut: "En attente",
  },
];

export const assurances: Assurance[] = [
  { id: "allianz", name: "Assurance Allianz" },
  { id: "atlanta", name: "Assurance ATLANTA" },
  { id: "amo", name: "AMO - Assurance Maladie Obligatoire" },
  { id: "axa", name: "AXA - Axa Assurance" },
  { id: "bam", name: "BAM - Bank Al Maghrib" },
  { id: "cnss", name: "CNSS - Caisse Nationale de Sécurité Sociale" },
  { id: "cnops", name: "CNOPS - Caisse Nationale des Organismes de Prévoyance Sociale" },
  { id: "mp", name: "MP - Mutuelle de la Police" },
  { id: "bp", name: "BP - Mutuelle des Banques Populaires" },
  { id: "md", name: "MD - Mutuelle des Douanes et des Impôts Indirects" },
  { id: "far", name: "FAR - Mutuelle des Forces Armées Royales" },
  { id: "mgptt", name: "MGPTT - Mutuelle des Postes et Télécommunications" },
  { id: "mgen", name: "MGEN - Mutuelle Générale de l'Education Nationale" },
  { id: "mgpap", name: "MGPAP - Mutuelle Générale du Personnel des Administrations Publiques" },
  { id: "omfam", name: "OMFAM - Oeuvres de Mutualité des Fonctionnaires et Agents au Maroc" },
  { id: "rmaw", name: "RMAW - Royale Marocaine d'Assurance - Watanya" },
  { id: "saham", name: "SAHAM - SAHAM Assurance" },
  { id: "wafa", name: "WAFA - Wafa Assurances" },
];


export const sampleSalesData = JSON.stringify([
  { "date": "2024-01-01", "quantity": 5 },
  { "date": "2024-01-02", "quantity": 7 },
  { "date": "2024-01-03", "quantity": 4 },
  { "date": "2024-01-04", "quantity": 6 },
  { "date": "2024-01-05", "quantity": 8 },
  { "date": "2024-01-06", "quantity": 5 },
  { "date": "2024-01-07", "quantity": 9 },
  { "date": "2024-01-08", "quantity": 7 },
  { "date": "2024-01-09", "quantity": 6 },
  { "date": "2024-01-10", "quantity": 8 },
  { "date": "2024-01-11", "quantity": 10 },
  { "date": "2024-01-12", "quantity": 7 },
  { "date": "2024-01-13", "quantity": 9 },
  { "date": "2024-01-14", "quantity": 6 },
  { "date": "2024-01-15", "quantity": 8 },
  { "date": "2024-01-16", "quantity": 11 },
  { "date": "2024-01-17", "quantity": 7 },
  { "date": "2024-01-18", "quantity": 9 },
  { "date": "2024-01-19", "quantity": 8 },
  { "date": "2024-01-20", "quantity": 10 },
  { "date": "2024-01-21", "quantity": 7 },
  { "date": "2024-01-22", "quantity": 9 },
  { "date": "2024-01-23", "quantity": 8 },
  { "date": "2024-01-24", "quantity": 11 },
  { "date": "2024-01-25", "quantity": 9 },
  { "date": "2024-01-26", "quantity": 7 },
  { "date": "2024-01-27", "quantity": 10 },
  { "date": "2024-01-28", "quantity": 8 },
  { "date": "2024-01-29", "quantity": 12 },
  { "date": "2024-01-30", "quantity": 9 }
], null, 2);

export const categories: Category[] = [
  { id: 'monture', name: 'Monture' },
  { id: 'verre', name: 'Verre' },
  { id: 'lentille', name: 'Lentille' },
  { id: 'solaire', name: 'Solaire' },
  { id: 'accessoire', name: 'Accessoire' },
];

export const colors: Color[] = [
  { id: 'transparent', name: 'Transparent', hexCode: '#FFFFFF' },
  { id: 'bleu-saphir', name: 'Bleu Saphir', hexCode: '#0F52BA' },
  { id: 'bleu-ciel', name: 'Bleu Ciel', hexCode: '#87CEEB' },
  { id: 'vert-emeraude', name: 'Vert émeraude', hexCode: '#50C878' },
  { id: 'vert-standard', name: 'Vert Standard', hexCode: '#008000' },
  { id: 'gris-perle', name: 'Gris Perle', hexCode: '#EAE0C8' },
  { id: 'gris-standard', name: 'Gris Standard', hexCode: '#808080' },
  { id: 'noisette-hazel', name: 'Noisette Hazel', hexCode: '#C49A6C' },
  { id: 'miel-honey', name: 'Miel Honey', hexCode: '#DAA520' },
  { id: 'caramel', name: 'Caramel', hexCode: '#C68E17' },
  { id: "marron-brown", name: "Marron Brown", hexCode: "#964B00" },
  { id: 'amethyste-violet', name: 'Améthyste Violet', hexCode: '#9966CC' },
  { id: 'noir', name: 'Noir', hexCode: '#000000' },
  { id: 'ecaille', name: 'Ecaille', hexCode: '#966919' }
];
