import { useState } from 'react';
import { orders } from '../../data/orderMockData';
import OrderList   from './OrderList';
import OrderDetail from './OrderDetail';

export default function OrderPortal() {
  const [selectedId, setSelectedId] = useState(null);

  const selected = selectedId ? orders.find(o => o.id === selectedId) : null;

  if (selected) {
    return (
      <OrderDetail
        order={selected}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return <OrderList onSelect={setSelectedId} />;
}
