import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './user.type';
import { UseGuards } from '@nestjs/common';
import { GraphqlAuthGuard } from 'src/auth/Guard/graphql.auth.guard';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { Request } from 'express';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';


@Resolver() 
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @UseGuards(GraphqlAuthGuard)
  @Mutation(() => User)
  async updateUser(
    @Args('fullname') fullname: string,
    @Args('file', { type: () => GraphQLUpload, nullable: true })
    file: GraphQLUpload.FileUpload,
    @Context() context: { req: Request },
  ) {
    const imageUrl = file? await this.storeImageAndGetUrl(file):null;
    const userId = context.req.user?.sub;
    return this.userService.updateUser(userId, fullname, imageUrl)
  }

  private async storeImageAndGetUrl(file: GraphQLUpload) {
    const { createReadStream, filename } = await file;
    const uniqueFilename = `${uuidv4()}_${filename}`;
    const imagePath = join(process.cwd(), 'public', 'images', uniqueFilename);
    const imageUrl = `${process.env.APP_URL}/images/${uniqueFilename}`;
    const readStream = createReadStream();
    readStream.pipe(createWriteStream(imagePath));
    return imageUrl;
  }

}
