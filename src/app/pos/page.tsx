'use client';

import React, { useState, useMemo } from 'react';
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    User,
    CreditCard,
    XCircle,
    CheckCircle,
    Package,
    Glasses,
    Eye,
    SprayCan
} from 'lucide-react';

// --- Types ---
type Category = 'Tous' | 'Montures' | 'Verres' | 'Lentilles' | 'Accessoires';

interface Product {
    id: string;
    name: string;
    price: number;
    category: Category;
    image?: string; // Placeholder for now
}

interface CartItem extends Product {
    quantity: number;
}

// --- Mock Data ---
const MOCK_PRODUCTS: Product[] = [
    // Montures
    { id: '1', name: 'Ray-Ban Aviator', price: 1500, category: 'Montures' },
    { id: '2', name: 'Oakley Holbrook', price: 1200, category: 'Montures' },
    { id: '3', name: 'Gucci GG0061S', price: 2800, category: 'Montures' },
    { id: '4', name: 'Tom Ford Henry', price: 3200, category: 'Montures' },

    // Verres
    { id: '5', name: 'Verres Anti-Reflet (Paire)', price: 400, category: 'Verres' },
    { id: '6', name: 'Verres Progressifs (Paire)', price: 1200, category: 'Verres' },
    { id: '7', name: 'Verres Blue-Cut (Paire)', price: 600, category: 'Verres' },

    // Lentilles
    { id: '8', name: 'Acuvue Oasys (Boîte)', price: 350, category: 'Lentilles' },
    { id: '9', name: 'Dailies Total 1', price: 450, category: 'Lentilles' },
    { id: '10', name: 'Biofinity Toric', price: 400, category: 'Lentilles' },

    // Accessoires
    { id: '11', name: 'Solution Renu (360ml)', price: 80, category: 'Accessoires' },
    { id: '12', name: 'Spray Nettoyant', price: 30, category: 'Accessoires' },
    { id: '13', name: 'Étui Rigide', price: 50, category: 'Accessoires' },
    { id: '14', name: 'Cordon Lunettes', price: 20, category: 'Accessoires' },
];

const CATEGORIES: Category[] = ['Tous', 'Montures', 'Verres', 'Lentilles', 'Accessoires'];

export default function POSPage() {
    // --- State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category>('Tous');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>(''); // Just string for now

    // --- Derived State ---
    const filteredProducts = useMemo(() => {
        return MOCK_PRODUCTS.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Tous' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tva = subtotal * 0.20; // 20% TVA
        const total = subtotal + tva; // Assuming prices are HT for this calculation, or we can adjust logic
        // Usually in retail prices are TTC. Let's assume input prices are HT for clarity, OR we can say prices are TTC.
        // Let's assume PRICES ARE TTC for simplicity in retail, but I will follow the request:
        // "Subtotal, TVA (20%), Discount (Remise), Total TTC" usually implies:
        // HT + TVA = TTC.
        // Let's treat the product price as HT for this exercise to show the math clearly.

        // Actually, usually in shops prices are displayed TTC. So:
        // Total TTC = Sum(Price * Qty)
        // HT = Total TTC / 1.2
        // TVA = Total TTC - HT

        const totalTTC = subtotal; // If we assume list prices are TTC
        const totalHT = totalTTC / 1.2;
        const totalTVA = totalTTC - totalHT;

        return {
            ht: totalHT,
            tva: totalTVA,
            ttc: totalTTC
        };
    }, [cart]);

    // --- Handlers ---
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const clearCart = () => setCart([]);

    const handleValidate = () => {
        if (cart.length === 0) return;
        alert(`Commande validée pour ${totals.ttc.toFixed(2)} MAD ! (Simulation)`);
        clearCart();
        setSelectedClient('');
    };

    const getCategoryIcon = (cat: Category) => {
        switch (cat) {
            case 'Montures': return <Glasses className="w-4 h-4 mr-2" />;
            case 'Verres': return <Eye className="w-4 h-4 mr-2" />;
            case 'Lentilles': return <Package className="w-4 h-4 mr-2" />;
            case 'Accessoires': return <SprayCan className="w-4 h-4 mr-2" />;
            default: return null;
        }
    };

    return (
        <div className="h-screen w-full bg-gray-50 flex overflow-hidden font-sans">

            {/* --- LEFT COLUMN: CATALOG (65% -> col-span-8) --- */}
            <div className="flex-1 flex flex-col h-full border-r border-gray-200" style={{ flex: '0 0 66.666%' }}>
                {/* Using flex-basis aprox 2/3 for visual accuracy to grid-cols-12 col-span-8 equivalent in flex */}

                {/* Top Bar: Search & Filters */}
                <div className="p-6 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Scanner code-barres ou chercher produit..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center ${selectedCategory === cat
                                        ? 'bg-black text-white shadow-lg'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {getCategoryIcon(cat)}
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex flex-col justify-between h-48 active:scale-95"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{product.category}</span>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                    </div>
                                </div>

                                <div className="text-center my-2">
                                    {/* Placeholder Icon/Image */}
                                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                        {getCategoryIcon(product.category) || <Package className="w-6 h-6 text-gray-400" />}
                                    </div>
                                    <h3 className="font-semibold text-gray-800 line-clamp-2 leading-tight">{product.name}</h3>
                                </div>

                                <div className="text-center">
                                    <span className="font-bold text-blue-600">{product.price.toFixed(2)} MAD</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            <p>Aucun produit trouvé.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- RIGHT COLUMN: CART (35% -> col-span-4) --- */}
            <div className="w-1/3 bg-white h-full flex flex-col shadow-2xl z-20" style={{ flex: '0 0 33.333%' }}>

                {/* Client Selection */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            Panier en cours
                        </h2>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">#{Math.floor(Math.random() * 10000)}</span>
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 appearance-none"
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                        >
                            <option value="">Client de Passage</option>
                            <option value="john">John Doe (Fidèle)</option>
                            <option value="jane">Jane Smith (Nouveau)</option>
                        </select>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                            <ShoppingCart className="w-16 h-16" />
                            <p className="text-sm font-medium">Le panier est vide</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-500">{item.price.toFixed(2)} MAD / unité</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border border-gray-200 rounded-md bg-gray-50">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="p-1 hover:bg-gray-200 text-gray-600 rounded-l transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="p-1 hover:bg-gray-200 text-gray-600 rounded-r transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="text-right w-16">
                                        <span className="font-bold text-gray-800 text-sm">{(item.price * item.quantity).toFixed(0)}</span>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Financials & Actions */}
                <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Total HT</span>
                            <span>{totals.ht.toFixed(2)} MAD</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>TVA (20%)</span>
                            <span>{totals.tva.toFixed(2)} MAD</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                            <span className="font-bold text-lg text-gray-800">Total TTC</span>
                            <span className="font-extrabold text-2xl text-blue-600">{totals.ttc.toFixed(2)} <span className="text-sm font-normal text-gray-500">MAD</span></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 h-14">
                        <button
                            onClick={clearCart}
                            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                        >
                            <XCircle className="w-5 h-5" />
                            Annuler
                        </button>
                        <button
                            onClick={handleValidate}
                            disabled={cart.length === 0}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Valider (F2)
                        </button>
                    </div>
                </div>

            </div>

        </div>
    );
}
