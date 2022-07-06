const functions = require('firebase-functions');
const cors = require('cors')({
  origin: true,
});

exports.compute = functions.https.onRequest((req, res) => {
  if (req.method === 'POST') {
    cors(req, res, () => {
      const data = req.body;
      const checkForGreaterSplit = data.SplitInfo.some(
        (val) => val.SplitValue > data.Amount
      );

      const checkForLessSplit = data.SplitInfo.some(
        (val) => val.SplitValue < 0
      );

      const allSplit = data.SplitInfo.map(
        (element) => element.SplitValue
      ).reduce((a, b) => a + b, 0);

      const checkGreatestSplit = allSplit > data.Amount;

      const checkInfoLength =
        data.SplitInfo.length >= 1 && data.SplitInfo.length <= 20;

      if (
        !checkForGreaterSplit &&
        !checkForLessSplit &&
        !checkGreatestSplit &&
        checkInfoLength
      ) {
        let sortByType = data.SplitInfo.sort((a, b) => {
          var nameA = a.SplitType.toLowerCase(),
            nameB = b.SplitType.toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        // console.log('sortbyType', sortByType);

        const checkForRatio = sortByType.some(
          (type) => type.SplitType === 'RATIO'
        );
        let ratioSum = 0;

        // console.log('check for ratio', checkForRatio);

        let ratioArray = null;
        if (checkForRatio) {
          ratioArray = sortByType.filter(
            (element) => element.SplitType === 'RATIO'
          );
          ratioSum = ratioArray
            .map((element) => element.SplitValue)
            .reduce((a, b) => a + b, 0);
        }

        const newSplitInfo = [];
        let initialBalance = data.Amount;
        let newBalance = initialBalance;
        let openingBal = 0;

        sortByType.forEach((ele) => {
          if (
            ele.SplitType === 'FLAT' ||
            ele.SplitType === 'PERCENTAGE' ||
            ele.SplitType === 'RATIO'
          ) {
            if (ele.SplitType === 'FLAT') {
              newBalance = newBalance - ele.SplitValue;
              console.log(
                `Split amount for ${ele.SplitEntityId}: `,
                ele.SplitValue
              );
              console.log(
                `Balance after split calculation for ${ele.SplitEntityId} ${newBalance} - ${ele.SplitValue}:: ${newBalance}`
              );
              openingBal = newBalance;
            }
            if (ele.SplitType === 'PERCENTAGE') {
              const pVal = (ele.SplitValue / 100) * newBalance;
              newBalance = newBalance - pVal;
              console.log(
                `Split amount for ${ele.SplitEntityId}: (${ele.SplitValue} % of ${newBalance}) = ${pVal}`
              );
              console.log(
                `Balance after split calculation for ${ele.SplitEntityId} ${newBalance} - ${pVal}:: ${newBalance}`
              );
              openingBal = newBalance;
            }
            if (ele.SplitType === 'RATIO') {
              const rVal = (ele.SplitValue / ratioSum) * openingBal;
              newBalance = newBalance - rVal;
              console.log(
                `Split amount for ${ele.SplitEntityId}: (${ele.SplitValue}/${ratioSum} * ${newBalance}) = ${rVal}`
              );
              console.log(
                `Balance after split calculation for ${ele.SplitEntityId}: ${newBalance} - ${rVal} :: ${newBalance}`
              );
            }
            const obj1 = {
              SplitEntityId: ele.SplitEntityId,
              Amount: ele.SplitValue,
            };
            newSplitInfo.push(obj1);
          } else {
            res.status(403).send('Wrong Format!');
            // console.log('error dey here too');
          }
        });

        const responseObj = {
          ID: data.ID,
          Balance: newBalance,
          SplitBreakdown: newSplitInfo,
        };

        // console.log('final bal', newBalance);
        // console.log('response', responseObj);

        if (newBalance < 0) {
          res.status(403).send('Balance is wrong!');
          // console.log('error');
        } else {
          return res.status(200).send(responseObj);
        }
      } else {
        res.status(403).send('Wrong Input!');
        // console.log('wrong input');
      }
    });
  } else {
    res.status(403).send('Forbidden!');
    return;
  }
});