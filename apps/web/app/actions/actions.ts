"use server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const addUser = async () => {
  await prisma.user.create({
    data: {
      name: "marvel",
      email: "marvel@gmail.com",
      password: "123456",
    },
  });
  console.log("User created!");
};
