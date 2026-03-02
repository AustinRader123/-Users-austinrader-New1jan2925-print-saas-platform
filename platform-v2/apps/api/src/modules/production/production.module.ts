import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';

@Module({
  controllers: [ProductionController],
})
export class ProductionModule {}
