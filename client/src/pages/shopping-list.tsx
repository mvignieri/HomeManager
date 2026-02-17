import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  Circle,
  BellRing,
  RotateCcw,
  GripVertical,
  X,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';
import { useAppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { useShoppingList } from '@/hooks/use-shopping-list';
import type { ShoppingListItem, User } from '@shared/schema';

const INITIAL_PURCHASE_POINTS = ['Supermercato', 'Cascina', 'Farmacia', 'Ferramenta'];

interface ShoppingCardProps {
  item: ShoppingListItem;
  isDragging?: boolean;
  onTogglePurchased: (itemId: number, nextState: boolean) => void;
  onDelete: (itemId: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function ShoppingCard({ item, isDragging, onTogglePurchased, onDelete, isUpdating, isDeleting }: ShoppingCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id.toString(),
    data: { item },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-lg border bg-white p-3 ${isDragging ? 'opacity-70 shadow-lg' : ''}`}
      {...listeners}
      {...attributes}
    >
      <button
        type="button"
        className="mr-3 text-slate-500"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePurchased(item.id, true);
        }}
        disabled={isUpdating}
      >
        <Circle className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800">{item.name}</p>
        <p className="text-xs text-slate-500">
          {item.quantity} {item.unit}
        </p>
      </div>
      <GripVertical className="mr-2 h-4 w-4 text-slate-400" />
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

interface PurchasePointColumnProps {
  point: string;
  items: ShoppingListItem[];
  onTogglePurchased: (itemId: number, nextState: boolean) => void;
  onDelete: (itemId: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function PurchasePointColumn({ point, items, onTogglePurchased, onDelete, isUpdating, isDeleting }: PurchasePointColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `point:${point}`,
    data: { point },
  });

  return (
    <div className="w-full min-w-[84vw] snap-start sm:min-w-[340px] lg:min-w-[300px]">
      <div className="glass-surface rounded-2xl border p-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-3">
          <h3 className="text-sm font-semibold text-slate-800">{point}</h3>
          <Badge variant="outline">{items.length}</Badge>
        </div>

        <div
          ref={setNodeRef}
          className={`mt-2 min-h-[160px] rounded-xl border border-dashed p-2 ${
            isOver ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50/50'
          }`}
        >
          {items.length === 0 ? (
            <div className="flex min-h-[130px] items-center justify-center text-center text-xs text-slate-400">
              Trascina qui i prodotti
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <ShoppingCard
                  key={item.id}
                  item={item}
                  onTogglePurchased={onTogglePurchased}
                  onDelete={onDelete}
                  isUpdating={isUpdating}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShoppingListPage() {
  const { currentHouse, user } = useAppContext();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('pcs');
  const [selectedPurchasePoint, setSelectedPurchasePoint] = useState('Supermercato');
  const [newPurchasePoint, setNewPurchasePoint] = useState('');
  const [customPurchasePoints, setCustomPurchasePoints] = useState<string[]>([]);
  const [activePointTab, setActivePointTab] = useState<string>('all');
  const [activeDragItemId, setActiveDragItemId] = useState<number | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const { data: dbUser } = useQuery<User | null>({
    queryKey: ['/api/users/me', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const res = await fetch(`/api/users/me?uid=${user.uid}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.uid,
  });

  const {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    commitChanges,
    isCreating,
    isUpdating,
    isDeleting,
    isCommitting,
  } = useShoppingList(currentHouse?.id);

  useEffect(() => {
    if (!currentHouse?.id) return;
    const storageKey = `shopping-points-${currentHouse.id}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setCustomPurchasePoints(INITIAL_PURCHASE_POINTS);
      setSelectedPurchasePoint(INITIAL_PURCHASE_POINTS[0]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validPoints = parsed.filter((point): point is string => typeof point === 'string');
        if (validPoints.length === 0) {
          setCustomPurchasePoints(INITIAL_PURCHASE_POINTS);
          setSelectedPurchasePoint(INITIAL_PURCHASE_POINTS[0]);
        } else {
          setCustomPurchasePoints(validPoints);
          if (!validPoints.includes(selectedPurchasePoint)) {
            setSelectedPurchasePoint(validPoints[0]);
          }
        }
      }
    } catch {
      setCustomPurchasePoints(INITIAL_PURCHASE_POINTS);
      setSelectedPurchasePoint(INITIAL_PURCHASE_POINTS[0]);
    }
  }, [currentHouse?.id, selectedPurchasePoint]);

  useEffect(() => {
    if (!currentHouse?.id) return;
    const storageKey = `shopping-points-${currentHouse.id}`;
    localStorage.setItem(storageKey, JSON.stringify(customPurchasePoints));
  }, [currentHouse?.id, customPurchasePoints]);

  const unpurchasedItems = useMemo(() => items.filter((item) => !item.isPurchased), [items]);
  const purchasedItems = useMemo(() => items.filter((item) => item.isPurchased), [items]);

  const purchasePoints = useMemo(() => {
    const fromItems = items.map((item) => (item.category || 'Supermercato').trim()).filter(Boolean);
    return Array.from(new Set([...customPurchasePoints, ...fromItems]));
  }, [items, customPurchasePoints]);

  const unpurchasedByPoint = useMemo(() => {
    return purchasePoints.reduce((acc, point) => {
      acc[point] = unpurchasedItems.filter((item) => (item.category || 'Supermercato') === point);
      return acc;
    }, {} as Record<string, ShoppingListItem[]>);
  }, [purchasePoints, unpurchasedItems]);

  const filteredUnpurchasedItems = useMemo(() => {
    if (activePointTab === 'all') return unpurchasedItems;
    return unpurchasedItems.filter((item) => (item.category || 'Supermercato') === activePointTab);
  }, [activePointTab, unpurchasedItems]);

  const activeDragItem = activeDragItemId ? unpurchasedItems.find((item) => item.id === activeDragItemId) : null;

  const resetAddForm = () => {
    setName('');
    setQuantity(1);
    setUnit('pcs');
  };

  const handleCreatePurchasePoint = () => {
    const normalized = newPurchasePoint.trim();
    if (!normalized) return;

    const alreadyExists = purchasePoints.some((point) => point.toLowerCase() === normalized.toLowerCase());
    if (!alreadyExists) {
      setCustomPurchasePoints((prev) => [...prev, normalized]);
    }

    setSelectedPurchasePoint(normalized);
    setActivePointTab(normalized);
    setNewPurchasePoint('');
  };

  const handleRemovePurchasePoint = (pointToRemove: string) => {
    const normalized = pointToRemove.trim();
    if (!normalized) return;

    const usedByItems = items.some(
      (item) => (item.category || 'Supermercato').toLowerCase() === normalized.toLowerCase()
    );
    if (usedByItems) {
      toast({
        title: 'Punto in uso',
        description: "Sposta prima i prodotti associati a questo punto d'acquisto.",
        variant: 'destructive',
      });
      return;
    }

    const remainingPoints = customPurchasePoints.filter((point) => point.toLowerCase() !== normalized.toLowerCase());
    setCustomPurchasePoints(remainingPoints);

    if (selectedPurchasePoint.toLowerCase() === normalized.toLowerCase()) {
      setSelectedPurchasePoint(remainingPoints[0] || '');
    }
    if (activePointTab.toLowerCase() === normalized.toLowerCase()) setActivePointTab('all');
  };

  const handleAddItem = async () => {
    if (!currentHouse?.id || !dbUser?.id || !name.trim()) return;
    const selectedPoint = selectedPurchasePoint.trim();

    if (!selectedPoint || !purchasePoints.includes(selectedPoint)) {
      toast({
        title: 'Punto d’acquisto richiesto',
        description: 'Seleziona o crea prima un punto d’acquisto.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createItem({
        houseId: currentHouse.id,
        addedById: dbUser.id,
        name: name.trim(),
        quantity,
        unit,
        category: selectedPoint,
      });
      resetAddForm();
      setHasPendingChanges(true);
    } catch {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile aggiungere il prodotto',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePurchased = async (itemId: number, nextState: boolean) => {
    if (!dbUser?.id) return;

    try {
      await updateItem({
        id: itemId,
        updates: {
          isPurchased: nextState,
          purchasedById: nextState ? dbUser.id : null,
        },
      });
      setHasPendingChanges(true);
    } catch {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile aggiornare il prodotto',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItem(itemId);
      setHasPendingChanges(true);
    } catch {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile eliminare il prodotto',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItemId(parseInt(event.active.id as string, 10));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItemId(null);

    if (!over) return;

    const itemId = parseInt(active.id as string, 10);
    const targetId = over.id as string;

    if (!targetId.startsWith('point:')) return;

    const targetPoint = targetId.replace('point:', '');
    const item = unpurchasedItems.find((entry) => entry.id === itemId);

    if (!item || item.category === targetPoint) return;

    try {
      await updateItem({
        id: itemId,
        updates: {
          category: targetPoint,
        },
      });
      setHasPendingChanges(true);
    } catch {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile spostare il prodotto.',
        variant: 'destructive',
      });
    }
  };

  const handleCommitChanges = async () => {
    if (!currentHouse?.id || !dbUser?.id || !hasPendingChanges) return;

    const summary = `Shopping list updated: ${unpurchasedItems.length} to buy, ${purchasedItems.length} purchased.`;

    try {
      await commitChanges({
        houseId: currentHouse.id,
        editorUserId: dbUser.id,
        summary,
      });
      setHasPendingChanges(false);
      toast({
        title: 'Lista confermata',
        description: 'Notifica inviata a tutti i partecipanti della casa.',
      });
    } catch {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile inviare le notifiche della lista.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Shopping List" />
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-y-auto px-3 py-4 pb-24 sm:px-4 md:ml-20 md:px-5 md:pb-4 lg:ml-64 lg:px-6">
        <div className="space-y-4">
        <Card className="glass-surface border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              Lista condivisa
            </CardTitle>
            <CardDescription>Aggiungi prodotti e marca quelli acquistati in tempo reale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_110px_110px_170px_auto]">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Latte, Pasta, Detersivo..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
              />
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value || 'pcs')}
                placeholder="pcs"
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedPurchasePoint}
                onChange={(e) => setSelectedPurchasePoint(e.target.value)}
              >
                <option value="" disabled>
                  Seleziona punto
                </option>
                {purchasePoints.map((point) => (
                  <option key={point} value={point}>
                    {point}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddItem} disabled={isCreating || !name.trim() || !selectedPurchasePoint.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={newPurchasePoint}
                onChange={(e) => setNewPurchasePoint(e.target.value)}
                placeholder="Nuovo punto d'acquisto (es. Mercato rionale)"
              />
              <Button type="button" variant="outline" onClick={handleCreatePurchasePoint} disabled={!newPurchasePoint.trim()}>
                Crea punto
              </Button>
            </div>

            {customPurchasePoints.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {customPurchasePoints.map((point) => (
                  <div key={point} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
                    <span className="mr-1 text-slate-600">{point}</span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => handleRemovePurchasePoint(point)}
                      aria-label={`Rimuovi punto ${point}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge variant="outline">Da comprare: {unpurchasedItems.length}</Badge>
              <Badge variant="outline">Acquistati: {purchasedItems.length}</Badge>
              {hasPendingChanges && <Badge className="bg-amber-100 text-amber-700">Modifiche non confermate</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Da acquistare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={activePointTab} onValueChange={setActivePointTab}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">Tutti</TabsTrigger>
                {purchasePoints.map((point) => (
                  <TabsTrigger key={point} value={point}>
                    {point}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {isLoading ? (
              <p className="text-sm text-gray-500">Caricamento...</p>
            ) : activePointTab === 'all' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                  {purchasePoints.map((point) => (
                    <PurchasePointColumn
                      key={point}
                      point={point}
                      items={unpurchasedByPoint[point] || []}
                      onTogglePurchased={handleTogglePurchased}
                      onDelete={handleDeleteItem}
                      isUpdating={isUpdating}
                      isDeleting={isDeleting}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeDragItem ? (
                    <div className="w-[300px]">
                      <ShoppingCard
                        item={activeDragItem}
                        isDragging
                        onTogglePurchased={handleTogglePurchased}
                        onDelete={handleDeleteItem}
                        isUpdating={isUpdating}
                        isDeleting={isDeleting}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : filteredUnpurchasedItems.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun prodotto da acquistare per questo punto.</p>
            ) : (
              filteredUnpurchasedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                  <button
                    type="button"
                    className="mr-3 text-slate-500"
                    onClick={() => handleTogglePurchased(item.id, true)}
                    disabled={isUpdating}
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} {item.unit} · {item.category}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acquistati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {purchasedItems.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun prodotto acquistato.</p>
            ) : (
              purchasedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border bg-emerald-50/50 p-3">
                  <CheckCircle2 className="mr-3 h-5 w-5 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-700 line-through">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} {item.unit} · {item.category}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    onClick={() => handleTogglePurchased(item.id, false)}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Da comprare
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        </div>

        <div className="mt-auto pt-3">
          <Button
            className="w-full h-11"
            onClick={handleCommitChanges}
            disabled={!hasPendingChanges || isCommitting}
          >
            <BellRing className="mr-2 h-4 w-4" />
            {isCommitting ? 'Invio notifiche...' : 'Conferma modifiche e notifica la casa'}
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
