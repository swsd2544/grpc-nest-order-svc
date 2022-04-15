import { PrismaService } from './prisma.service';
import { CreateOrderRequestDto } from './order.dto';
import {
  ProductServiceClient,
  PRODUCT_SERVICE_NAME,
  FindOneResponse,
  DecreaseStockResponse,
} from './proto/product.pb';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { CreateOrderResponse } from './proto/order.pb';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService implements OnModuleInit {
  private productSvc: ProductServiceClient;

  constructor(
    @Inject(PRODUCT_SERVICE_NAME) private readonly client: ClientGrpc,
    private readonly prisma: PrismaService,
  ) {}

  public onModuleInit(): void {
    this.productSvc =
      this.client.getService<ProductServiceClient>(PRODUCT_SERVICE_NAME);
  }

  public async createOrder(
    data: CreateOrderRequestDto,
  ): Promise<CreateOrderResponse> {
    const product: FindOneResponse = await firstValueFrom(
      this.productSvc.findOne({ id: data.productId }),
    );

    if (product.status >= HttpStatus.NOT_FOUND) {
      return { id: null, error: ['Product not found'], status: product.status };
    } else if (product.data.stock < data.quantity) {
      return {
        id: null,
        error: ['Stock too low'],
        status: HttpStatus.CONFLICT,
      };
    }

    const order = await this.prisma.order.create({
      data: {
        price: product.data.price,
        productId: product.data.id,
        userId: data.userId,
      },
    });

    const decreaseStockData: DecreaseStockResponse = await firstValueFrom(
      this.productSvc.decreaseStock({ id: data.productId, orderId: order.id }),
    );

    if (decreaseStockData.status === HttpStatus.CONFLICT) {
      // deleting order if decreaseStock fails
      await this.prisma.order.delete({ where: { id: order.id } });

      return {
        id: null,
        error: decreaseStockData.error,
        status: HttpStatus.CONFLICT,
      };
    }

    return { id: order.id, error: null, status: HttpStatus.OK };
  }
}
