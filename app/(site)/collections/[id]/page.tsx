import { notFound } from "next/navigation";
import {
  getCollectionProduct,
  getCollectionProductDetails,
} from "@/content/site/collection";
import { ProductDetailView } from "./ProductDetailView";

export default async function CollectionProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const baseProduct = getCollectionProduct(id);
  if (!baseProduct) notFound();
  const product = getCollectionProductDetails(baseProduct);
  return <ProductDetailView key={product.id} product={product} />;
}
