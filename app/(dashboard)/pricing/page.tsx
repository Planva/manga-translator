// app/(dashboard)/pricing/page.tsx
import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

// Fetch pricing data at request time to avoid build-time API calls
export const dynamic = 'force-dynamic';

interface ProductWithPrice {
  id: string;
  name: string;
  description: string | null;
  priceId: string;
  unitAmount: number;
  interval: 'month' | 'year';
  trialPeriodDays: number | null;
}

export default async function PricingPage() {
  // 1) 并行拉取产品和价格
  const [products, prices] = await Promise.all([
    getStripeProducts(),
    getStripePrices(),
  ]);

  // 2) 把 product 和 price 通过 defaultPriceId/id 关联起来
  const items: ProductWithPrice[] = products
    .map((product) => {
      const price = prices.find((p) => p.id === product.defaultPriceId);
      if (!price) return null; // 没 price 就跳过
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        priceId: price.id,
        unitAmount: price.unitAmount!,
        interval: price.interval!,
        trialPeriodDays: price.trialPeriodDays ?? 0,
      };
    })
    .filter(Boolean) as ProductWithPrice[];

  // 3) 渲染所有项目
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        {items.map((plan) => (
          <PricingCard key={plan.id} {...plan} />
        ))}
      </div>
    </main>
  );
}

function PricingCard({
  name,
  description,
  unitAmount,
  interval,
  trialPeriodDays,
  priceId,
}: ProductWithPrice) {
  return (
    <div className="pt-6 border rounded-lg p-6 shadow">
      <h2 className="text-2xl font-medium text-gray-900 mb-1">{name}</h2>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      <p className="text-4xl font-medium text-gray-900 mb-1">
        ${unitAmount / 100}
        <span className="text-xl font-normal text-gray-600">
          {' '}
          per user / {interval}
        </span>
      </p>
      <p className="text-sm text-gray-500 mb-6">
        with {trialPeriodDays} day{trialPeriodDays === 1 ? '' : 's'} free trial
      </p>
      <ul className="space-y-4 mb-8">
        <li className="flex items-start">
          <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-gray-700">Your feature list here</span>
        </li>
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}
