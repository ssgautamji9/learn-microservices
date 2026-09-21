import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import { toPublicProfileResponse, toUserProfileResponse } from "../dtos/userProfile.dto";
import { publishEvent } from "../services/events/publisher";
export async function getMyProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // const userId = req.user!.id;
    const userId = req.header("x-user-id") || '';
    const profile = await userService.getProfileByUserId(userId);
    res.json(toUserProfileResponse(profile));
  } catch (error) {
    next(error);
  }
}

export async function getPublicProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const targetUserId = Array.isArray(userId) ? userId[0] : userId;
    const profile = await userService.getProfileByUserId(targetUserId);
    const data = toPublicProfileResponse(profile);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const updatedProfile = await userService.updateProfileByUserId(userId, req.body);
    // publish user.updated event for other services to consume

    await publishEvent("user.updated", {
      eventId: randomUUID(),
      event:"user.updated",
      userId,
      displayName: updatedProfile.displayName,
      updatedAt: updatedProfile.updatedAt.toISOString(),
    })

    res.json(updatedProfile);
  } catch (error) {
    next(error);
  }
}


export async function getAllUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}