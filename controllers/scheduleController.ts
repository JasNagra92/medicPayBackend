import {
  ISingleDaysPayDataForClient,
  ITwoWeekPayPeriodForClient,
} from "./../interfaces/dbInterfaces";
import { Response } from "express";
import { IRequestForPayDayData } from "../interfaces/dbInterfaces";
import {
  generateSingleDaysDataForClient,
  getPayPeriodSchedule,
  getPayPeriodStart,
} from "../utils/scheduleGenerationUtils";

export const getTwoWeekPayPeriodData = (
  req: IRequestForPayDayData,
  res: Response
) => {
  const { userInfo, requestedPayDays } = req.body;
  let responseData: ITwoWeekPayPeriodForClient[] = [];

  requestedPayDays.forEach((payDay) => {
    let workDaysInPayPeriod: ISingleDaysPayDataForClient[] = [];
    let requestedPayDay = new Date(payDay);
    let payPeriodStart = getPayPeriodStart(requestedPayDay);
    let payPeriodSchedule = getPayPeriodSchedule(
      payPeriodStart,
      userInfo.platoon
    );

    payPeriodSchedule.forEach((workDay) => {
      workDaysInPayPeriod.push(
        generateSingleDaysDataForClient(userInfo, workDay)
      );
    });
    responseData.push({
      payDay: requestedPayDay,
      workDaysInPayPeriod,
    });
  });

  res.status(200).send({ data: responseData });
};
