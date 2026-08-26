import {
  getAvailableProducts,
  purchaseProduct,
  restorePurchases,
  IAP_PRODUCT_IDS,
} from '../../services/purchaseService';

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('purchaseService', () => {
  it('returns available monthly and yearly products', async () => {
    const products = await getAvailableProducts();
    expect(products.length).toBe(2);
    expect(products.some(p => p.id === IAP_PRODUCT_IDS.MONTHLY)).toBe(true);
    expect(products.some(p => p.id === IAP_PRODUCT_IDS.YEARLY)).toBe(true);
  });

  it('completes purchaseProduct with a valid transaction id', async () => {
    const result = await purchaseProduct(IAP_PRODUCT_IDS.MONTHLY);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });

  it('runs restorePurchases and returns status', async () => {
    const result = await restorePurchases();
    expect(result.success).toBe(true);
  });
});
