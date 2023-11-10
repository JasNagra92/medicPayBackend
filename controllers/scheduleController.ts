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

export const getTwoWeekPayPeriodData = async (
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
      getBaseWageEarnings() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.getBaseWageEarnings(),
          0
        );
      },
      getTotalEarnings() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.getDayTotal(),
          0
        );
      },
      getNightHoursWorked() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.nightHoursWorked,
          0
        );
      },
      getBaseHoursWorkedInPayPeriod() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.baseHoursWorked,
          0
        );
      },
      getWeekendHoursWorked() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.weekendHoursWorked,
          0
        );
      },
      getLevellingHours() {
        return 80 - this.getBaseHoursWorkedInPayPeriod();
      },
      getAlphaNightTotalEarnings() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.getAlphaNightsTotal(),
          0
        );
      },
      getNightShiftTotalEarnings() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.getNightEarningsTotal(),
          0
        );
      },
      getWeekendTotalEarnings() {
        return this.workDaysInPayPeriod.reduce(
          (total, day) => total + day.getWeekendTotal(),
          0
        );
      },
      workDaysInPayPeriod,
    });
  });

  res.status(200).send({ data: responseData });
};
