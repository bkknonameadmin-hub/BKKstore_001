"use client";
import { useEffect } from "react";
import { trackViewItem } from "@/lib/analytics";

type Props = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  price: number;
};

export default function ViewItemTracker(props: Props) {
  useEffect(() => {
    trackViewItem({
      value: props.price,
      items: [{
        item_id: props.id,
        item_name: props.name,
        item_brand: props.brand,
        item_category: props.category,
        price: props.price,
        quantity: 1,
      }],
    });
  }, [props.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
