import React, { useState, useEffect } from 'react';
import { X, Plus, ShieldCheck, Zap, Flame, RefreshCcw, ShoppingBag, Check } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    orderId: string;
    amount: number;
    customerId: string;
    items: string[];
    idempotencyKey?: string;
    failAtStepKey?: string;
    failureMode?: 'CRASH' | 'TRANSIENT' | 'PERMANENT';
  }) => void;
  isLoading: boolean;
  currentCustomerName?: string;
}

const CATALOG_ITEMS = [
  { name: 'MacBook Pro M3', price: 1299.0, icon: '💻' },
  { name: 'Sony WH-1000XM5 Headphones', price: 349.5, icon: '🎧' },
  { name: 'Dell UltraSharp 4K Monitor', price: 599.0, icon: '🖥️' },
  { name: 'Keychron Mechanical Keyboard', price: 119.0, icon: '⌨️' },
  { name: 'iPhone 16 Pro Max', price: 1199.0, icon: '📱' },
];

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  currentCustomerName = 'Aditya Kumar',
}) => {
  const [orderId, setOrderId] = useState('');
  const [customerId, setCustomerId] = useState(currentCustomerName);
  const [amount, setAmount] = useState('349.50');
  const [selectedItems, setSelectedItems] = useState<string[]>(['Sony WH-1000XM5 Headphones']);
  const [customItem, setCustomItem] = useState('');
  const [useIdempotency, setUseIdempotency] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [simulationMode, setSimulationMode] = useState<'NONE' | 'CRASH' | 'TRANSIENT' | 'PERMANENT'>('NONE');

  useEffect(() => {
    if (isOpen) {
      const generatedId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      setOrderId(generatedId);
      setIdempotencyKey(`idem-key-${generatedId.toLowerCase()}`);
      setCustomerId(currentCustomerName);
    }
  }, [isOpen, currentCustomerName]);

  if (!isOpen) return null;

  const toggleCatalogItem = (item: { name: string; price: number }) => {
    if (selectedItems.includes(item.name)) {
      const updated = selectedItems.filter((i) => i !== item.name);
      setSelectedItems(updated);
      calculateTotal(updated);
    } else {
      const updated = [...selectedItems, item.name];
      setSelectedItems(updated);
      calculateTotal(updated);
    }
  };

  const calculateTotal = (itemsList: string[]) => {
    let total = 0;
    itemsList.forEach((it) => {
      const found = CATALOG_ITEMS.find((c) => c.name === it);
      if (found) total += found.price;
      else total += 99.0;
    });
    setAmount(total > 0 ? total.toFixed(2) : '99.00');
  };

  const handleAddCustomItem = () => {
    if (!customItem.trim()) return;
    const updated = [...selectedItems, customItem.trim()];
    setSelectedItems(updated);
    calculateTotal(updated);
    setCustomItem('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let failAtStepKey: string | undefined;
    let failureMode: 'CRASH' | 'TRANSIENT' | 'PERMANENT' | undefined;

    if (simulationMode === 'CRASH') {
      failAtStepKey = 'UPDATE_INVENTORY';
      failureMode = 'CRASH';
    } else if (simulationMode === 'TRANSIENT') {
      failAtStepKey = 'PROCESS_PAYMENT';
      failureMode = 'TRANSIENT';
    } else if (simulationMode === 'PERMANENT') {
      failAtStepKey = 'VALIDATE_ORDER';
      failureMode = 'PERMANENT';
    }

    onSubmit({
      orderId: orderId.trim(),
      amount: parseFloat(amount) || 99.99,
      customerId: customerId.trim(),
      items: selectedItems.length > 0 ? selectedItems : ['Custom Order Item'],
      idempotencyKey: useIdempotency ? idempotencyKey : undefined,
      failAtStepKey,
      failureMode,
    });
  };

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', background: '#0e1424', border: '1px solid #1e293b' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '6px', borderRadius: '6px', color: '#38bdf8' }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Add New Customer Order
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Dispatches a multi-step crash-proof order workflow to the engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Order ID & Customer ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Order Number
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Customer / Account Name
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Quick Item Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
              Select Products / Catalog Items
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CATALOG_ITEMS.map((item) => {
                const isSelected = selectedItems.includes(item.name);
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleCatalogItem(item)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#090e18',
                      border: '1px solid ' + (isSelected ? '#38bdf8' : '#1e293b'),
                      color: isSelected ? '#38bdf8' : '#94a3b8',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.8, color: '#10b981' }}>${item.price}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>

            {/* Custom Item input */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Or type a custom product name..."
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                style={{
                  flex: 1,
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#f8fafc',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Amount & Items List */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Total Order Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#10b981',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Order Items Summary
              </label>
              <div
                style={{
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  minHeight: '38px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {selectedItems.join(', ') || 'No items selected'}
              </div>
            </div>
          </div>

          {/* Idempotency Protection */}
          <div style={{ background: '#090e18', border: '1px solid #1a2234', borderRadius: '8px', padding: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f8fafc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useIdempotency}
                onChange={(e) => setUseIdempotency(e.target.checked)}
              />
              <ShieldCheck size={14} color="#34d399" />
              <span>Idempotency Key (Prevents duplicate charges on retry)</span>
            </label>
            {useIdempotency && (
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: '#050810',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                }}
              />
            )}
          </div>

          {/* Test / Simulation Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Execution Simulation (Optional Test Scenario)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSimulationMode('NONE')}
                style={{
                  background: simulationMode === 'NONE' ? '#1e3a8a' : '#090e18',
                  border: '1px solid ' + (simulationMode === 'NONE' ? '#3b82f6' : '#1e293b'),
                  color: simulationMode === 'NONE' ? '#93c5fd' : '#94a3b8',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Zap size={12} color="#38bdf8" />
                <span>Normal Run</span>
              </button>

              <button
                type="button"
                onClick={() => setSimulationMode('CRASH')}
                style={{
                  background: simulationMode === 'CRASH' ? 'rgba(239, 68, 68, 0.2)' : '#090e18',
                  border: '1px solid ' + (simulationMode === 'CRASH' ? '#ef4444' : '#1e293b'),
                  color: simulationMode === 'CRASH' ? '#fca5a5' : '#94a3b8',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Flame size={12} color="#f87171" />
                <span>Simulate Crash</span>
              </button>

              <button
                type="button"
                onClick={() => setSimulationMode('TRANSIENT')}
                style={{
                  background: simulationMode === 'TRANSIENT' ? 'rgba(245, 158, 11, 0.2)' : '#090e18',
                  border: '1px solid ' + (simulationMode === 'TRANSIENT' ? '#f59e0b' : '#1e293b'),
                  color: simulationMode === 'TRANSIENT' ? '#fde68a' : '#94a3b8',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCcw size={12} color="#fbbf24" />
                <span>Simulate Retry</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #1e293b',
                color: '#94a3b8',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-start"
              disabled={isLoading}
              style={{ padding: '10px 22px' }}
            >
              <Plus size={16} />
              <span>{isLoading ? 'Dispatching...' : 'Place Order & Run Engine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
