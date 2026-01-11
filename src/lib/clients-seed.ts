import { format } from 'date-fns';

// Helper to generate a random number within a range (inclusive)
const randomInRange = (min: number, max: number, precision: number = 2) => {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(precision));
};

// Helper to generate a random integer
const randomIntInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper to generate a random number string
const randomNumberString = (length: number) => {
  return Math.random().toString().slice(2, 2 + length);
};


const createTestClient = (
  nom: string,
  prenom: string,
  email: string,
  telephone1: string,
  adresse: string,
) => {
  const today = new Date();
  
  return {
    nom,
    prenom,
    email,
    telephone1,
    adresse,
    ville: 'Casablanca',
    sexe: Math.random() > 0.5 ? 'Homme' : 'Femme',
    dateNaissance: format(new Date(today.getFullYear() - randomIntInRange(20, 60), today.getMonth(), today.getDate()), 'yyyy-MM-dd'),
    if: randomNumberString(8),
    ice: `00${randomNumberString(7)}0000${randomNumberString(2)}`,
    rc: randomNumberString(5),
    lastVisit: today.toISOString(),
    prescriptions: [
      {
        date: format(today, 'yyyy-MM-dd'),
        type: 'Vision de loin' as const,
        prescripteur: 'Dr. Opto',
        odSphere: randomInRange(-6, 6).toString(),
        odCylindre: randomInRange(-4, 0).toString(),
        odAxe: randomIntInRange(0, 180).toString(),
        ogSphere: randomInRange(-6, 6).toString(),
        ogCylindre: randomInRange(-4, 0).toString(),
        ogAxe: randomIntInRange(0, 180).toString(),
        ecartPupillaire: randomIntInRange(60, 72).toString(),
        hauteurMontage: randomIntInRange(18, 22).toString(),
        notes: 'Ceci est une prescription de test générée automatiquement.',
      },
    ],
  };
};

export const generateTestClients = () => [
  createTestClient('Alami', 'Ahmed', 'ahmed.alami@email.ma', '+212 6 12 34 56 78', '12 Rue de la Liberté, Casablanca'),
  createTestClient('Benali', 'Fatima', 'fatima.b@email.ma', '+212 6 23 45 67 89', '45 Avenue des FAR, Casablanca'),
  createTestClient('Zaari', 'Youssef', 'youssef.z@email.ma', '+212 6 34 56 78 90', '78 Boulevard d\'Anfa, Casablanca'),
  createTestClient('Idrissi', 'Khadija', 'khadija.i@email.ma', '+212 6 45 67 89 01', '101 Rue de Paris, Casablanca'),
  createTestClient('Tazi', 'Omar', 'omar.tazi@email.ma', '+212 6 56 78 90 12', '23 Boulevard Mohammed V, Casablanca'),
];
