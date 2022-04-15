import { CreateOrderRequestDto } from './order.dto';
import { OrderService } from './order.service';
import { Controller, Inject } from '@nestjs/common';
import { CreateOrderResponse, ORDER_SERVICE_NAME } from './proto/order.pb';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class OrderController {
  @Inject(OrderService)
  private readonly service: OrderService;

  @GrpcMethod(ORDER_SERVICE_NAME, 'CreateOrder')
  private async createOrder(
    data: CreateOrderRequestDto,
  ): Promise<CreateOrderResponse> {
    return this.service.createOrder(data);
  }
}
