import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ServiceRequestModule } from './service-request/service-request.module';
import { AdminModule } from './admin/admin.module';
import { BillModule } from './bill/bill.module';
import { CorporateEnquiryModule } from './corporate-enquiry/corporate-enquiry.module';
import { B2cEnquiryModule } from './b2c-enquiry/b2c-enquiry.module';
import { SalesReportModule } from './sales-report/sales-report.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
    }),
    AuthModule,
    AdminModule,
    ServiceRequestModule,
    BillModule,
    CorporateEnquiryModule,
    B2cEnquiryModule,
    SalesReportModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false,
        } : false,
      }),
      inject: [ConfigService],
    }),
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
