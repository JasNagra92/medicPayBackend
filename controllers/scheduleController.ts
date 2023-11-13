import {
  IRequestForWholeStiip,
  ISingleDaysPayDataForClient,
  ITwoWeekPayPeriodForClient,
} from "./../interfaces/dbInterfaces";
import { Response, Request } from "express";
import { IRequestForPayDayData } from "../interfaces/dbInterfaces";
import {
  generateSingleDaysDataForClient,
  getPayPeriodSchedule,
  getPayPeriodStart,
  payDaysMap,
  generateWholeStiipShift,
} from "../utils/scheduleGenerationUtils";

export const getTwoWeekPayPeriodData = (
  req: IRequestForPayDayData,
  res: Response
) => {
  const { userInfo, monthAndYear } = req.body;
  let responseData: ITwoWeekPayPeriodForClient[] = [];
  let requestedPayDays = payDaysMap.get(monthAndYear);

  requestedPayDays!.forEach((payDay) => {
    let workDaysInPayPeriod: ISingleDaysPayDataForClient[] = [];
    let payPeriodStart = getPayPeriodStart(payDay);
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
      payDay: payDay,
      workDaysInPayPeriod,
    });
  });

  res.status(200).send({ data: responseData });
};

export const getWholeStiipData = (
  req: IRequestForWholeStiip,
  res: Response
) => {
  const { userInfo, date, rotation } = req.body;
  const singleDayWholeStiip = generateWholeStiipShift(userInfo, date, rotation);

  res.status(200).send({ data: singleDayWholeStiip });
};
