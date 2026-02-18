"use client";
import React, { useState, useEffect } from "react";
import { getClients, createClient } from "@/features/clients/actions";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, CheckCircle2, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  selectedClient: any;
  onNext: (client: any) => void;
}

export default function Step1Client({ selectedClient, onNext }: Props) {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newClient, setNewClient] = useState({ fullName: "", phone: "" });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await getClients(undefined);
        setClients(data.map(c => ({
            id: c.id,
            nom: c.fullName,
            phone: c.phone
        })));
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filtered = clients.filter(c => 
    c.nom.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const handleQuickAdd = async () => {
    if (!newClient.fullName || !newClient.phone) {
      toast({ title: "خطأ", description: "يجب إدخال الاسم والهاتف", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const result = await createClient({
        fullName: newClient.fullName,
        phone: newClient.phone,
        // Minimal data for quick add
      });
      
      if (result) {
        const mapped = { id: result.id, nom: result.fullName, phone: result.phone };
        onNext(mapped);
      }
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  if (isAddingNew) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-2 mb-4">
           <Button variant="ghost" size="icon" onClick={() => setIsAddingNew(false)}>
              <ArrowLeft className="h-4 w-4" />
           </Button>
           <h3 className="font-bold text-lg">عميل جديد (سريع)</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الاسم الكامل *</label>
            <Input
              placeholder="مثال: محمد العلوي"
              value={newClient.fullName}
              onChange={(e) => setNewClient({ ...newClient, fullName: e.target.value })}
              className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">رقم الهاتف *</label>
            <Input
              placeholder="0612345678"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl text-blue-700 text-xs flex gap-3 items-start">
             <div className="bg-blue-200 p-1 rounded-full text-blue-700">ℹ️</div>
             <p>يمكنك إكمال باقي المعلومات (العنوان، البريد الإلكتروني، إلخ) لاحقاً من ملف العميل.</p>
          </div>

          <Button 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
            onClick={handleQuickAdd}
            disabled={isCreating}
          >
            {isCreating ? "جاري الحفظ..." : "حفظ والمتابعة"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="ابحث عن عميل..."
          className="pl-10 h-11 border-slate-200 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-2xl divide-y bg-white shadow-inner">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search className="h-8 w-8" />
             </div>
             <p className="text-slate-500">لا يوجد عميل بهذا الاسم.</p>
             <Button variant="outline" className="gap-2 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setIsAddingNew(true)}>
                <UserPlus className="h-4 w-4" /> إضافة عميل جديد
             </Button>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => onNext(c)}
              className={`p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-all border-l-4 ${
                selectedClient?.id === c.id ? "border-blue-500 bg-blue-50/50" : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                   <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{c.nom}</p>
                  <p className="text-xs text-slate-500">{c.phone || "بدون هاتف"}</p>
                </div>
              </div>
              {selectedClient?.id === c.id && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
            </div>
          ))
        )}
      </div>

      <Button 
        variant="ghost" 
        className="w-full h-12 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2 border-2 border-dashed border-blue-100 rounded-xl"
        onClick={() => setIsAddingNew(true)}
      >
        <UserPlus className="h-4 w-4" /> عميل جديد (سريع)
      </Button>
    </div>
  );
}
