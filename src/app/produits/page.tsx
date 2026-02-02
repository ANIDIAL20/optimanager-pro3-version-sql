import { getProducts, getCategories } from '@/features/products/actions';
import { ProductsClientView } from './_components/products-client-view';
import { type Product } from '@/components/dashboard/produits/columns';

export default async function ProductsPage() {
  // Fetch initial data on the server
  const productsData = await getProducts(); // Returns Product[]
  const categoriesData = await getCategories(); // Returns {id, name}[]

  // Map to Frontend Product Interface
  const mappedProducts: Product[] = productsData.map((p: any) => ({
    id: p.id.toString(),
    reference: p.reference || '',
    nomProduit: p.nom,
    prixAchat: parseFloat(p.prixAchat || '0'),
    prixVente: parseFloat(p.prixVente || '0'),
    quantiteStock: p.quantiteStock || 0,
    stockMin: p.seuilAlerte || 5,
    categorie: p.categorie || '',
    marque: p.marque || '',
    description: p.description,
    categorieId: '',
    marqueId: ''
  }));

  return (
    <ProductsClientView 
        initialProducts={mappedProducts} 
        initialCategories={categoriesData} 
    />
  );
}
