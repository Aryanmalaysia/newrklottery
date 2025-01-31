import connection from "../config/connectDB";
import axios from 'axios';
import moment from "moment";
import crypto from "crypto";
import request from "request";
import querystring from "querystring"


const PaymentStatusMap = {
    PENDING: 0,
    SUCCESS: 1,
    CANCELLED: 2
}

const PaymentMethodsMap = {
    UPI_GATEWAY: "upi_gateway",
    UPI_MANUAL: "upi_manual",
    USDT_MANUAL: "usdt_manual",
    WOW_PAY: "wow_pay",
    USDT: "usdt",
    SUNPAY: 'sun_pay',
    FFPAY: 'ff_pay',    
 BANK_PAY: "manual_pay",

}

const initiateManualUPIPayment = async (req, res) => {
    const query = req.query

    const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'upi'");

    let bank_recharge_momo_data
    if (bank_recharge_momo.length) {
        bank_recharge_momo_data = bank_recharge_momo[0]
    }

    const momo = {
        bank_name: bank_recharge_momo_data?.name_bank || "",
        username: bank_recharge_momo_data?.name_user || "",
        upi_id: bank_recharge_momo_data?.stk || "",
        usdt_wallet_address: bank_recharge_momo_data?.qr_code_image || "",
    }

    return res.render("wallet/manual_payment.ejs", {
        Amount: query?.am,
        UpiId: momo.upi_id,
    });
}

const initiateManualBankPayment = async (req, res) => {
    const query = req.query

    const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'upi'");

    let bank_recharge_momo_data
    if (bank_recharge_momo.length) {
        bank_recharge_momo_data = bank_recharge_momo[0]
    }

   const momo = {
        bank_name: bank_recharge_momo_data?.name_bank || "",
        ifsc: bank_recharge_momo_data?.ifsc  || "",
        name_user : bank_recharge_momo_data?.accountNumber    || "",
        username: bank_recharge_momo_data?.name_user || "",
        upi_id: bank_recharge_momo_data?.stk || "",
        usdt_wallet_address: bank_recharge_momo_data?.usdt  || "",
    }


    return res.render("wallet/manual_payment_bank.ejs", {
        Amount: query?.am,
        ...momo
    });
}

const upi_autogateway = async (req, res) => {
    const query = req.query;
    let auth = req.cookies.auth;
    let Amount = query?.am;

    try {
        // Fetch user data based on the token from cookies
        const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ?', [auth]);

        // Check if any user data is returned
        if (!rows.length) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: new Date(), // Replace `timeNow` with actual time, e.g., new Date()
            });
        }

        let userinfo = rows[0];

        // Redirect to the UPI payment gateway with the necessary parameters
        res.redirect(`https://pay.kheloyarmasti.club/lottery81_api.php?amount=${Amount}&user=${userinfo.phone}`);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            status: false,
            timeStamp: new Date(),
        });
    }
};


const initiateManualUSDTPayment = async (req, res) => {
    const query = req.query

    const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'upi'");

    let bank_recharge_momo_data
    if (bank_recharge_momo.length) {
        bank_recharge_momo_data = bank_recharge_momo[0]
    }

    const momo = {
        bank_name: bank_recharge_momo_data?.name_bank || "",
        username: bank_recharge_momo_data?.name_user || "",
        upi_id: bank_recharge_momo_data?.stk || "",
        usdt_wallet_address: bank_recharge_momo_data?.usdt || "",
    }

    return res.render("wallet/usdt_manual_payment.ejs", {
        Amount: query?.am,
        UsdtWalletAddress: momo.usdt_wallet_address,
    });
}

const addManualUPIPaymentRequest = async (req, res) => {
    try {
        const data = req.body
        let auth = req.cookies.auth;
        let money = parseInt(data.money);
        let utr = parseInt(data.utr);
        const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)
        let timeNow = Date.now();
        if (!money || !(money >= minimumMoneyAllowed)) {
            return res.status(400).json({
                message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
                status: false,
                timeStamp: timeNow,
            })
        }

        if (!utr && utr?.length != 12) {
            return res.status(400).json({
                message: `UPI Ref No. or UTR is Required And it should be 12 digit long`,
                status: false,
                timeStamp: timeNow,
            })
        }

        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }

        const orderId = getRechargeOrderId()

        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: utr,
            phone: user.phone,
            money: money,
            type: PaymentMethodsMap.UPI_MANUAL,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: "NULL",
            time: Date.now(),
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Requested successfully Your Balance will update shortly!',
            recharge: recharge,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}


const addBankPaymentRequest = async (req, res) => {
    try {
        const data = req.body
        let auth = req.cookies.auth;
        let money = parseInt(data.money);
        let utr = parseInt(data.utr);
        const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)
        let timeNow = Date.now();
        // if (!money || !(money >= minimumMoneyAllowed)) {
        //     return res.status(400).json({
        //         message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
        //         status: false,
        //         timeStamp: timeNow,
        //     })
        // }

        if (!utr && utr?.length != 12) {
            return res.status(400).json({
                message: `UPI Ref No. or UTR is Required And it should be 12 digit long`,
                status: false,
                timeStamp: timeNow,
            })
        }

        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.BANK_PAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }

        const orderId = getRechargeOrderId()

        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: utr,
            phone: user.phone,
            money: money,
            type: PaymentMethodsMap.BANK_PAY,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: "NULL",
            time: Date.now(),
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Requested successfully Your Balance will update shortly!',
            recharge: recharge,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

const addManualUSDTPaymentRequest = async (req, res) => {
    try {
        let timeNow = Date.now();
        const data = req.body
        let auth = req.cookies.auth;
        let money_usdt = parseInt(data.money);
        let money = money_usdt * 92;
        let utr = data.utr
        // const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

        // if (!money || !(money >= minimumMoneyAllowed)) {
        //     return res.status(400).json({
        //         message: `Money is Required and it should be ₹${minimumMoneyAllowed} or ${(minimumMoneyAllowed / 92).toFixed(2)} or above!`,
        //         status: false,
        //         timeStamp: timeNow,
        //     })
        // }

        if (!utr) {
            return res.status(400).json({
                message: `Ref No. or UTR is Required`,
                status: false,
                timeStamp: timeNow,
            })
        }

        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.USDT_MANUAL })

        // if (pendingRechargeList.length !== 0) {
        //     const deleteRechargeQueries = pendingRechargeList.map(recharge => {
        //         return rechargeTable.cancelById(recharge.id)
        //     });

        //     await Promise.all(deleteRechargeQueries)
        // }

        const orderId = getRechargeOrderId()

        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: utr,
            phone: user.phone,
            money: money,
            type: PaymentMethodsMap.USDT_MANUAL,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: "NULL",
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Requested successfully Your Balance will update shortly!',
            recharge: recharge,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

const initiateUPIPayment = async (req, res) => {
    let timeNow = Date.now();
    const type = PaymentMethodsMap.UPI_GATEWAY
    let auth = req.cookies.auth;
    let money = parseInt(req.body.money);

    const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

    if (!money || !(money >= minimumMoneyAllowed)) {
        return res.status(400).json({
            message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
        })
    }

    try {
        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }

        const orderId = getRechargeOrderId()

        const ekqrResponse = await axios.post('https://api.ekqr.in/api/create_order', {
            key: process.env.UPI_GATEWAY_PAYMENT_KEY,
            client_txn_id: orderId,
            amount: String(money),
            p_info: process.env.PAYMENT_INFO,
            customer_name: user.username,
            customer_email: process.env.PAYMENT_EMAIL,
            customer_mobile: user.phone,
            redirect_url: `${process.env.APP_BASE_URL}/wallet/verify/upi`,
            udf1: process.env.APP_NAME,
        })

        const ekqrData = ekqrResponse?.data

        if (ekqrData === undefined || ekqrData.status === false) {
            throw Error("Gateway er!#ror from ekqr!")
        }

        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: null,
            phone: user.phone,
            money: money,
            type: type,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: ekqrData.data.payment_url,
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        console.log(ekqrData)

        return res.status(200).json({
            message: 'Payment Initiated successfully',
            recharge: recharge,
            urls: {
                web_url: ekqrData.data.payment_url,
                bhim_link: ekqrData.data?.upi_intent?.bhim_link || "",
                phonepe_link: ekqrData.data?.upi_intent?.phonepe_link || "",
                paytm_link: ekqrData.data?.upi_intent?.paytm_link || "",
                gpay_link: ekqrData.data?.upi_intent?.gpay_link || "",
            },
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

const initiateSunpayPayment = async (req, res) => {
    let timeNow = Date.now();
    const type = PaymentMethodsMap.SUNPAY
    let auth = req.cookies.auth;
    let inputAmount = parseInt(req.body.money);

    const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

    if (!inputAmount || !(inputAmount >= minimumMoneyAllowed)) {
        return res.status(400).json({
            message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
        })
    }

    try {
        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.SUNPAY })

        // if (pendingRechargeList.length !== 0) {
        //     const deleteRechargeQueries = pendingRechargeList.map(recharge => {
        //         return rechargeTable.cancelById(recharge.id)
        //     });

        //     await Promise.all(deleteRechargeQueries)
        // }

        const order_id = getRechargeOrderId()
        function generateSign(params, secretkey) {
            params = Object.keys(params).sort().reduce((acc, key) => {
                if (key !== 'sign') {
                    acc.push(`${key}=${params[key]}`);
                }
                return acc;
            }, []).join('&');

            const signStr = `${params}&key=${secretkey}`;
            return crypto.createHash('md5').update(signStr).digest('hex');
        }
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const callbackurl = 'https://RK Lottery.com/wallet/paynow/verify-sunpay';

        const params = {
            version: '1.0',
            mch_id: '888168897',
            mch_order_no: order_id,
            pay_type: '102',
            trade_amount: inputAmount,
            order_date: date,
            goods_name: 'user goods_name',
            notify_url: callbackurl,
            mch_return_msg: 'user mch_return_msg',
        };
        params.sign = generateSign(params, 'd60cd81fe0694f48ae64847839b68e53');
        params.sign_type = 'MD5';
        const options = {
            url: 'https://pay.sunpayonline.xyz/pay/web',
            method: 'POST',
            form: params,
        };
        let sunpayResponse = await new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
        if (sunpayResponse === undefined || sunpayResponse.tradeMsg !== 'request success') {
            throw Error("Gateway er!#ror from fastpay!")
        }

        const newRecharge = {
            orderId: order_id,
            transactionId: sunpayResponse.mchOrderNo,
            utr: 1,
            phone: user.phone,
            money: inputAmount,
            type: type,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: sunpayResponse.payInfo,
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Initiated successfully',
            recharge: recharge,
            url: sunpayResponse.payInfo,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}


const initiateFfpayPayment = async (req, res) => {
    let timeNow = Date.now();
    const type = PaymentMethodsMap.FFPAY
    let auth = req.cookies.auth;
    let inputAmount = parseInt(req.body.money);

    const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

    if (!inputAmount || !(inputAmount >= minimumMoneyAllowed)) {
        return res.status(400).json({
            message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
        })
    }

    try {
        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.FFPAY })

        const order_id = getRechargeOrderId()
        function generateSign(params, secretkey) {
            params = Object.keys(params).sort().reduce((acc, key) => {
                if (key !== 'sign') {
                    acc.push(`${key}=${params[key]}`);
                }
                return acc;
            }, []).join('&');

            const signStr = `${params}&key=${secretkey}`;
            return crypto.createHash('md5').update(signStr).digest('hex');
        }
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const callbackurl = 'https://RK Lottery.com/wallet/paynow/verify-ffpay';

        const params = {
            version: '1.0',
            mch_id: '100996629',
            mch_order_no: order_id,
            pay_type: 105,
            trade_amount: inputAmount,
            order_date: date,
            goods_name: 'user goods_name',
            notify_url: callbackurl,
            page_url: callbackurl,
            mch_return_msg: 'user mch_return_msg',
        };

        params.sign = generateSign(params, '0232772692514ec8a40a507734b44d4d');
        params.sign_type = 'MD5';
        const options = {
            url: 'https://api.ffpays.com/pay/web',
            method: 'POST',
            form: params,
        };
        let sunpayResponse = await new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
        if (sunpayResponse === undefined || sunpayResponse.tradeMsg !== 'request success') {
            throw Error("Gateway er!#ror from fastpay!")
        }

        const newRecharge = {
            orderId: order_id,
            transactionId: sunpayResponse.mchOrderNo,
            utr: 1,
            phone: user.phone,
            money: inputAmount,
            type: type,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: sunpayResponse.payInfo,
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Initiated successfully',
            recharge: recharge,
            url: sunpayResponse.payInfo,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

function validateSignByKey(signStr, merchant_key, retsign) {
    if (merchant_key !== '') {
        signStr += "&key=" + merchant_key;
    }
    let signkey =  crypto.createHash('md5').update(signStr).digest('hex');
    return signkey === retsign;
}

const verifySunpayPayment = async (req, res) => {
    try {
        const {
            mchId,
            mchOrderNo,
            orderDate,
            oriAmount,
            tradeResult,
            signType,
            sign,
            merRetMsg,
            orderNo
        } = req.body;
        console.log(req.body)
        console.log(JSON.stringify(req))
        const [results] = await connection.query('SELECT * FROM recharge WHERE id_order = ?', [mchOrderNo]);

        if (results.length > 0) {
            if (results[0].status === 1) {
                console.log('Recharge status is already completed. Skipping user money update.');
            } else {
                await connection.query('UPDATE recharge SET status = 1 WHERE id_order = ?', [mchOrderNo]);
                await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?', [results[0].money, results[0].money, results[0].phone]);
                console.log('User money updated.');
            }
        } else {
            console.log('Transaction not found.');
        }
    } catch (error) {
        console.log(error);
    }
}

const verifyffpayPayment = async (req, res) => {
    try {
        const {
            mchId,
            mchOrderNo,
            orderDate,
            oriAmount,
            tradeResult,
            signType,
            amount,
            sign,
            merRetMsg,
            orderNo
        } = req.body;

        let postData = {
            amount ,
            mchId ,
            mchOrderNo,
            merRetMsg,
            orderDate ,
            orderNo ,
            oriAmount ,
            tradeResult ,
            signType ,
            sign 
        };
        let signStr = "";
        for (let key in postData) {
            if (key !== 'sign' && postData.hasOwnProperty(key)) {
                signStr += key + "=" + postData[key] + "&";
            }
        }
        signStr = signStr.slice(0, -1);
        let retsign = postData.sign;
        let isValid = true// validateSignByKey(signStr, merchant_key, retsign);
        const [results] = await connection.query('SELECT * FROM recharge WHERE id_order = ?', [mchOrderNo]);

        if (isValid && results.length > 0) {
            if (results[0].status === 1) {
                console.log('Recharge status is already completed. Skipping user money update.');
            } else {
                await connection.query('UPDATE recharge SET status = 1 WHERE id_order = ?', [mchOrderNo]);
                await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?', [results[0].money, results[0].money, results[0].phone]);
                console.log('User money updated.');
            }
        } else {
            console.log('Transaction not found.');
        }
    } catch (error) {
        console.log(error);
    }
}

const verifyUPIPayment = async (req, res) => {
    let timeNow = Date.now();
    const type = PaymentMethodsMap.UPI_GATEWAY
    let auth = req.cookies.auth;
    let orderId = req.query.client_txn_id;

    if (!auth || !orderId) {
        return res.status(400).json({
            message: `orderId is Required!`,
            status: false,
            timeStamp: timeNow,
        })
    }
    try {
        const user = await getUserDataByAuthToken(auth)

        const recharge = await rechargeTable.getRechargeByOrderId({ orderId })

        if (!recharge) {
            return res.status(400).json({
                message: `Unable to find recharge with this order id!`,
                status: false,
                timeStamp: timeNow,
            })
        }

        const ekqrResponse = await axios.post('https://api.ekqr.in/api/check_order_status', {
            key: process.env.UPI_GATEWAY_PAYMENT_KEY,
            client_txn_id: orderId,
            txn_date: rechargeTable.getDMYDateOfTodayFiled(recharge.today),
        });

        const ekqrData = ekqrResponse?.data

        if (ekqrData === undefined || ekqrData.status === false) {
            throw Error("Gateway error from ekqr!")
        }

        if (ekqrData.data.status === "created") {
            return res.status(200).json({
                message: 'Your payment request is just created',
                status: false,
                timeStamp: timeNow,
            });
        }

        if (ekqrData.data.status === "scanning") {
            return res.status(200).json({
                message: 'Waiting for confirmation',
                status: false,
                timeStamp: timeNow,
            });
        }

        if (ekqrData.data.status === 'success') {

            if (recharge.status === PaymentStatusMap.PENDING || recharge.status === PaymentStatusMap.CANCELLED) {

                await rechargeTable.setStatusToSuccessByIdAndOrderId({
                    id: recharge.id,
                    orderId: recharge.orderId
                })

                await addUserAccountBalance({
                    phone: user.phone,
                    money: recharge.money,
                    code: user.code,
                    invite: user.invite,
                })
            }

            // return res.status(200).json({
            //     status: true,
            //     message: "Payment verified",
            //     timestamp: timeNow
            // })
            return res.redirect("/wallet/rechargerecord")
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

const initiateWowPayPayment = async (req, res) => {
    let timeNow = Date.now();
    const type = PaymentMethodsMap.WOW_PAY
    let auth = req.cookies.auth;
    let money = parseInt(req.query.money);

    const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

    if (!money || !(money >= minimumMoneyAllowed)) {
        return res.status(400).json({
            message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
        })
    }

    try {
        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }

        const orderId = getRechargeOrderId()
        const date = wowpay.getCurrentDate()

        const params = {
            version: '1.0',
            // mch_id: 222887002,
            mch_id: process.env.WOWPAY_MERCHANT_ID,
            mch_order_no: orderId,
            // pay_type: '151',
            pay_type: '151',
            trade_amount: money,
            order_date: date,
            goods_name: user.phone,
            // notify_url: `${process.env.APP_BASE_URL}/wallet/verify/wowpay`,
            notify_url: `https://247cashwin.cloud/wallet/verify/wowpay`,
            mch_return_msg: user.phone,
            // payment_key: 'TZLMQ1QWJCUSFLH02LAYRZBJ1WK7IHSG',
        };

        params.page_url = 'https://247cashwin.cloud/wallet/verify/wowpay';

        params.sign = wowpay.generateSign(params, process.env.WOWPAY_MERCHANT_KEY);
        // params.sign = wowpay.generateSign(params, 'TZLMQ1QWJCUSFLH02LAYRZBJ1WK7IHSG');
        // params.sign = wowpay.generateSign(params, 'MZBG89MDIBEDWJOJQYEZVSNP8EEVMSPM');
        params.sign_type = "MD5";


        console.log(params)

        const response = await axios({
            method: "post",
            url: 'https://pay6de1c7.wowpayglb.com/pay/web',
            data: querystring.stringify(params)
        })

        console.log(response.data)

        if (response.data.respCode === "SUCCESS" && response.data.payInfo) {
            return res.status(200).json({
                message: "Payment requested Successfully",
                payment_url: response.data.payInfo,
                status: true,
                timeStamp: timeNow,
            })
        }


        return res.status(400).json({
            message: "Payment request failed. Please try again Or Wrong Details.",
            status: false,
            timeStamp: timeNow,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}


const verifyWowPayPayment = async (req, res) => {
    let timeNow = Date.now();
    try {
        const type = PaymentMethodsMap.WOW_PAY
        let data = req.body;

        if (!req.body) {
            data = req.query;
        }

        console.log(data)

        let merchant_key = process.env.WOWPAY_MERCHANT_KEY;

        const params = {
            mchId: process.env.WOWPAY_MERCHANT_ID,
            amount: data.amount || '',
            mchOrderNo: data.mchOrderNo || '',
            merRetMsg: data.merRetMsg || '',
            orderDate: data.orderDate || '',
            orderNo: data.orderNo || '',
            oriAmount: data.oriAmount || '',
            tradeResult: data.tradeResult || '',
            signType: data.signType || '',
            sign: data.sign || '',
        };

        let signStr = "";
        signStr += "amount=" + params.amount + "&";
        signStr += "mchId=" + params.mchId + "&";
        signStr += "mchOrderNo=" + params.mchOrderNo + "&";
        signStr += "merRetMsg=" + params.merRetMsg + "&";
        signStr += "orderDate=" + params.orderDate + "&";
        signStr += "orderNo=" + params.orderNo + "&";
        signStr += "oriAmount=" + params.oriAmount + "&";
        signStr += "tradeResult=" + params.tradeResult;

        let flag = wowpay.validateSignByKey(signStr, merchant_key, params.sign);

        if (!flag) {
            console.log({
                status: false,
                message: "Something went wrong!",
                flag,
                timestamp: timeNow
            })
            return res.status(400).json({
                status: false,
                message: "Something went wrong!",
                flag,
                timestamp: timeNow
            })
        }

        const newRechargeParams = {
            orderId: params.mchOrderNo,
            transactionId: 'NULL',
            utr: null,
            phone: params.merRetMsg,
            money: params.amount,
            type: type,
            status: PaymentStatusMap.SUCCESS,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: 'NULL',
            time: timeNow,
        }


        const recharge = await rechargeTable.getRechargeByOrderId({ orderId: newRechargeParams.orderId })

        if (!!recharge) {
            console.log({
                message: `Recharge already verified!`,
                status: true,
                timeStamp: timeNow,
            })
            return res.status(400).json({
                message: `Recharge already verified!`,
                status: true,
                timeStamp: timeNow,
            })
        }

        const newRecharge = await rechargeTable.create(newRechargeParams)

        await addUserAccountBalance({
            phone: user.phone,
            money: recharge.money,
            code: user.code,
            invite: user.invite,
        })

        return res.redirect("/wallet/rechargerecord")
    } catch (error) {
        console.log({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
        return res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}


// helpers ---------------
const getUserDataByAuthToken = async (authToken) => {
    let [users] = await connection.query('SELECT `phone`, `code`,`name_user`,`invite` FROM users WHERE `token` = ? ', [authToken]);
    const user = users?.[0]


    if (user === undefined || user === null) {
        throw Error("Unable to get user data!")
    }

    return {
        phone: user.phone,
        code: user.code,
        username: user.name_user,
        invite: user.invite,
    }
}


const addUserAccountBalance = async ({ money, phone, invite }) => {
    const user_money = money + (money / 100) * 5
    const inviter_money = (money / 100) * 5

    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?', [user_money, user_money, phone]);

    const [inviter] = await connection.query('SELECT phone FROM users WHERE `code` = ?', [invite]);

    if (inviter.length) {
        console.log(inviter)
        console.log(inviter_money, inviter_money, invite, inviter?.[0].phone)
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `code` = ? AND `phone` = ?', [inviter_money, inviter_money, invite, inviter?.[0].phone]);
        console.log("SUCCESSFULLY ADD MONEY TO inviter")
    }
}


const getRechargeOrderId = () => {
    const date = new Date();
    let id_time = date.getUTCFullYear() + '' + date.getUTCMonth() + 1 + '' + date.getUTCDate();
    let id_order = Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) + 10000000000000;

    return id_time + id_order
}

const rechargeTable = {
    getRecordByPhoneAndStatus: async ({ phone, status, type }) => {
        if (![PaymentStatusMap.SUCCESS, PaymentStatusMap.CANCELLED, PaymentStatusMap.PENDING].includes(status)) {
            throw Error("Invalid Payment Status!")
        }

        let recharge

        if (type) {
            [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? AND type = ?', [phone, status, type]);
        } else {
            [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ?', [phone, status]);
        }

        return recharge.map((item) => ({
            id: item.id,
            orderId: item.id_order,
            transactionId: item.transaction_id,
            utr: item.utr,
            phone: item.phone,
            money: item.money,
            type: item.type,
            status: item.status,
            today: item.today,
            url: item.url,
            time: item.time,
        }))
    },
    getRechargeByOrderId: async ({ orderId }) => {
        const [recharge] = await connection.query('SELECT * FROM recharge WHERE id_order = ?', [orderId]);

        if (recharge.length === 0) {
            return null
        }

        return recharge.map((item) => ({
            id: item.id,
            orderId: item.id_order,
            transactionId: item.transaction_id,
            utr: item.utr,
            phone: item.phone,
            money: item.money,
            type: item.type,
            status: item.status,
            today: item.today,
            url: item.url,
            time: item.time,
        }))?.[0]
    },
    cancelById: async (id) => {
        if (typeof id !== "number") {
            throw Error("Invalid Recharge 'id' expected a number!")
        }


        await connection.query('UPDATE recharge SET status = 2 WHERE id = ?', [id]);
    },
    setStatusToSuccessByIdAndOrderId: async ({ id, orderId }) => {
        if (typeof id !== "number") {
            throw Error("Invalid Recharge 'id' expected a number!")
        }


        console.log(id, orderId)

        const [re] = await connection.query('UPDATE recharge SET status = 1 WHERE id = ? AND id_order = ?', [id, orderId]);
        console.log(re)
    },
    getCurrentTimeForTodayField: () => {
        return moment().format("YYYY-DD-MM h:mm:ss A")
    },
    getDMYDateOfTodayFiled: (today) => {
        return moment(today, "YYYY-DD-MM h:mm:ss A").format("DD-MM-YYYY")
    },
    create: async (newRecharge) => {

        if (newRecharge.url === undefined || newRecharge.url === null) {
            newRecharge.url = "0"
        }

        await connection.query(
            `INSERT INTO recharge SET id_order = ?, transaction_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?, utr = ?`,
            [newRecharge.orderId, newRecharge.transactionId, newRecharge.phone, newRecharge.money, newRecharge.type, newRecharge.status, newRecharge.today, newRecharge.url, newRecharge.time, newRecharge?.utr || "NULL"]
        );


        const [recharge] = await connection.query('SELECT * FROM recharge WHERE id_order = ?', [newRecharge.orderId]);

        if (recharge.length === 0) {
            throw Error("Unable to create recharge!")
        }

        return recharge[0]
    }
}






module.exports = {
    initiateUPIPayment,
    initiateSunpayPayment,
    initiateFfpayPayment,
    verifyUPIPayment,
    initiateWowPayPayment,
    verifyWowPayPayment,
    initiateManualUPIPayment,
    initiateManualBankPayment,
    upi_autogateway,
    addManualUPIPaymentRequest,
    addBankPaymentRequest,
    verifySunpayPayment,
    verifyffpayPayment,
    addManualUSDTPaymentRequest,
    initiateManualUSDTPayment,
}