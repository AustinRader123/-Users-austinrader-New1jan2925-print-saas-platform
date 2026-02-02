import { ProductService } from './src/services/ProductService.js';

const service = new ProductService();

async function test() {
  console.log('Testing resolveStoreId...');
  const storeId1 = await service.resolveStoreId('default');
  console.log('Resolved "default" to:', storeId1);
  
  const storeId2 = await service.resolveStoreId('cml42d9070001mgkyz13ut0fq');
  console.log('Resolved UUID to:', storeId2);
}

test().catch(console.error).finally(() => process.exit(0));
