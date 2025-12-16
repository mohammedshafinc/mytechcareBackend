import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
    login(number: string) {
        if(!number) {
            throw new BadRequestException('Number is Required')
        }

         const saudiRegex = /^(?:\+966|966|0)?5\d{8}$/;
         if (!saudiRegex.test(number)) {
      throw new BadRequestException('Invalid Saudi mobile number');
    }

    return {
        success:true,
        message:'Login succesfull'
    }
    }
}
