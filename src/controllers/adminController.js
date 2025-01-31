import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
const ExcelJS = require('exceljs');
const fs = require('fs');
require('dotenv').config();

let timeNow = Date.now();

const adminPage = async (req, res) => {
    return res.render("manage/index.ejs");
}

const adminPage3 = async (req, res) => {
    return res.render("manage/a-index-bet/index3.ejs");
}

const adminPage5 = async (req, res) => {
    return res.render("manage/a-index-bet/index5.ejs");
}

const adminPage10 = async (req, res) => {
    return res.render("manage/a-index-bet/index10.ejs");
}

const adminPage5d = async (req, res) => {
    return res.render("manage/5d.ejs");
}

const adminPageK3 = async (req, res) => {
    return res.render("manage/k3.ejs");
}

const ctvProfilePage = async (req, res) => {
    var phone = req.params.phone;
    return res.render("manage/profileCTV.ejs", { phone });
}

const giftPage = async (req, res) => {
    return res.render("manage/giftPage.ejs");
}

const membersPage = async (req, res) => {
    return res.render("manage/members.ejs");
}

const ctvPage = async (req, res) => {
    return res.render("manage/ctv.ejs");
}

const infoMember = async (req, res) => {
    let phone = req.params.id;
    return res.render("manage/profileMember.ejs", { phone });
}

const statistical = async (req, res) => {
    let data = req.query.datechoice ? req.query.datechoice : null;
    return res.render("manage/statistical.ejs", { data });
}

const rechargePage = async (req, res) => {
    return res.render("manage/recharge.ejs");
}

const rechargeRecord = async (req, res) => {
    return res.render("manage/rechargeRecord.ejs");
}
const turnover = async (req, res) => {
    return res.render("manage/turnover.ejs");
}
const betting = async (req, res) => {
    return res.render("manage/betting.ejs");
}

const todayreport = async (req, res) => {
    return res.render("manage/todayreport.ejs");
}

const withdraw = async (req, res) => {
    return res.render("manage/withdraw.ejs");
}

const withdrawRecord = async (req, res) => {
    return res.render("manage/withdrawRecord.ejs");
}
const settings = async (req, res) => {
    return res.render("manage/settings.ejs");
}


// xác nhận admin
const middlewareAdminController = async (req, res, next) => {
    // xác nhận token
    const auth = req.cookies.auth;
    if (!auth) {
        return res.redirect("/login");
    }
    const [rows] = await connection.execute('SELECT `token`,`level`, `status` FROM `users` WHERE `token` = ? AND veri = 1', [auth]);
    if (!rows) {
        return res.redirect("/login");
    }
    try {
        if (auth == rows[0].token && rows[0].status == 1) {
            if (rows[0].level == 1) {
                next();
            } else {
                return res.redirect("/home");
            }
        } else {
            return res.redirect("/login");
        }
    } catch (error) {
        return res.redirect("/login");
    }
}
const getCurrentDate = () => {
    const currentDate = new Date();

    // Extract year, month, and day
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');

    // Format the date as "YYYY-MM-DD"
    const formattedDate = `${year}-${month}-${day}`;

    return formattedDate;
};
const rechargeCallback = async (req, res) => {
    let orderids = req.body.client_txn_id;
    const parts = orderids.split('_');
    const orderid = parts[0];
    let status = req.body.status;
    console.log(orderid, status);
    try {
        if (status == "success") {
            await ConfirmRecharge(orderid, function (data) {
                res.status(200).json(data);
            });
        } else if (status !== "success") {
            await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [orderid]);
            res.status(200).json({ "status": "Error By Response" });
        }
    } catch (e) {
        console.log({ "status": e });
        res.status(200).json({ "status": "By Response code", "res": e });
    }
    //     await CheckCashfreeStatus(orderid, async function(response) {
    //         response = JSON.parse(response);
    //         console.log(response.customer_details.customer_id);
    //         id = parseInt(response.customer_details.customer_id);
    //         if (response.order_status === "PAID") {
    //             await ConfirmRecharge(id);
    //         } else if (response.order_status !== "ACTIVE") {
    //             await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);
    //         }
    //     });
    //     // return res.status(200).json({"status": id});
    //     res.redirect("/");

}
const AgentCommission = async (req, res) => {
    try {
        const outerQueryResult = await connection.query('SELECT * FROM users WHERE `level` = 2 ', []);
        for (const item of outerQueryResult[0]) {
            let sum = 0;
            if (item.phone) {
                const innerQueryResult = await connection.query('SELECT users.*, SUM(minutes_1.money) AS total_betting FROM users LEFT JOIN minutes_1 ON minutes_1.phone = users.phone WHERE `ctv` = ? GROUP BY users.phone', [item.phone]);
                if (innerQueryResult[0].length > 0) {
                    for (const item1 of innerQueryResult[0]) {
                        if (item1.total_betting != null && item1.total_betting > 0 && item1.total_betting != "") {
                            sum = sum + item1.total_betting;
                        }
                    }
                }
            }
            if (sum > 0) {
                let finalPercentange = sum * 0.01;
                let sql = `INSERT INTO transaction SET
                purpose = ?,
                phone = ?,
                money = ?,
                type = ?,
                status = ?,
                level = ?,
                today = ?,
                time = ?`;
                let checkTime = getCurrentDate();
                await connection.execute(sql, ["agent_commission", item.phone, finalPercentange, 'credit', 1, 1, checkTime, checkTime]);
                await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [finalPercentange, finalPercentange, item.phone]);
            }
        }
        return res.status(200).json("Success");
    } catch (e) {
        return res.status(500).json({ error: 'Outer query error' });
    }
};

const totalJoin = async (req, res) => {
    let auth = req.cookies.auth;
    let typeid = req.body.typeid;
    if (!typeid) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let game = '';
    if (typeid == '1') game = 'wingo';
    if (typeid == '2') game = 'wingo3';
    if (typeid == '3') game = 'wingo5';
    if (typeid == '4') game = 'wingo10';

    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? ', [auth]);

    if (rows.length > 0) {
        const [wingoall] = await connection.query(`SELECT * FROM minutes_1 WHERE game = "${game}" AND status = 0 AND level = 0 ORDER BY id ASC `, [auth]);
        const [winGo1] = await connection.execute(`SELECT * FROM wingo WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `, []);
        const [winGo10] = await connection.execute(`SELECT * FROM wingo WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `, []);
        const [setting] = await connection.execute(`SELECT * FROM admin `, []);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: wingoall,
            lotterys: winGo1,
            list_orders: winGo10,
            setting: setting,
            timeStamp: timeNow,
        });
    } else {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
}

const listMember = async (req, res) => {
    let { pageno, limit, value, status } = req.body;

    // Check if pageno and limit are provided
    if (!pageno || !limit || pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "Invalid pagination parameters",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    try {
        // Build the SQL query based on provided parameters
        let query = `SELECT * FROM users WHERE veri = 1 AND level != 2`;
        if (value) {
            query += ` AND (phone LIKE "%${value}%" OR id_user LIKE "%${value}%" OR id LIKE "%${value}%")`;
        }
        if (status) {
            query += ` AND status = ${status}`;
        }
        query += ` ORDER BY id DESC LIMIT ${pageno}, ${limit}`;

        // Execute the query to fetch users for the current page
        const [users] = await connection.query(query);

        // Execute a separate query to get the total count of users (for pagination)
        const [total_users] = await connection.query(`SELECT COUNT(*) as total FROM users WHERE veri = 1 AND level != 2`);

        // Calculate total pages based on the total count of users and limit
        const total_pages = Math.ceil(total_users[0].total / limit);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: users,
            page_total: total_pages
        });
    } catch (e) {
        res.send(e.message);

    }
}

const FindTBettingByinvite = async (invite) => {
    let Total = 0;

    let currlevel = [{ code: invite }];

    for (let i = 0; i < 10; i++) {
        let arra = [];
        const promises = currlevel.map(async (user) => {
            const result = await connection.query(
                'SELECT users.*, COALESCE(SUM(minutes_1.money), 0) AS total_betting FROM users LEFT JOIN minutes_1 ON users.phone = minutes_1.phone WHERE users.invite = ? GROUP BY users.phone',
                [user.code]
            );

            result[0].forEach((userData) => {
                Total += parseFloat(userData.total_betting);
                arra.push(userData);
            });
        });
        await Promise.all(promises);
        currlevel = arra;
    }

    return Total;
};
const listCTV = async (req, res) => {
    let { pageno, pageto } = req.body;

    if (!pageno || !pageto) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || pageto < 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [wingo] = await connection.query(`SELECT users.* FROM users WHERE veri = 1 AND level = 2 ORDER BY id DESC LIMIT ${pageno}, ${pageto} `);
    let wingos = [];

    // Use map to create a new array with 'total_betting' property
    wingos = await Promise.all(wingo.map(async (user) => {
        const totalBetting = await FindTBettingByinvite(user.code);
        return { ...user, total_betting: totalBetting };
    }));

    // Now 'wingos' contains all data from 'wingo' with 'total_betting' property
    console.log(wingos);

    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: wingos,
    });
}

function formateT2(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin2(params = '') {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = Date.now();
        date = new Date(Number(date));
    }
    let years = formateT2(date.getFullYear());
    let months = formateT2(date.getMonth() + 1);
    let days = formateT2(date.getDate());

    return years + "-" + months + "-" + days;
}

const statistical2 = async (req, res) => {
    let datefil = req.body.today == "" ? false : req.body.today;
    const [wingo] = await connection.query(`SELECT SUM(money) as total,COUNT(id) as count FROM minutes_1 WHERE status = 1 `);
    const [wingo2] = await connection.query(`SELECT SUM(money) as total,COUNT(id) as count FROM minutes_1 WHERE status = 2 `);
    const [users] = await connection.query(`SELECT COUNT(id) as total FROM users WHERE status = 1 `);
    const [users2] = await connection.query(`SELECT COUNT(id) as total FROM users WHERE status = 0 `);
    const [recharge] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 `);
    const [withdraw] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE status = 1 `);
    const [bet] = await connection.query(`SELECT SUM(money) as total FROM minutes_1`, []);
    const [pl] = await connection.query(`SELECT SUM(\`money\` - \`get\`) as total FROM minutes_1`, []);
    //  }
    const [recharge_today] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 AND date(today) = ?`, [!datefil ? timerJoin2() : datefil]);
    const [bet_today] = await connection.query(`SELECT SUM(money) as total FROM minutes_1 WHERE date(today) = ?`, [!datefil ? timerJoin2() : datefil]);
    const [pl_today] = await connection.query(`SELECT SUM(\`money\` - \`get\`) as total FROM minutes_1 WHERE date(today) = ?`, [!datefil ? timerJoin2() : datefil]);
    const [withdraw_today] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE status = 1 AND date(today) = ?`, [!datefil ? timerJoin2() : datefil]);

    let win = wingo[0].total;
    let wincount = wingo[0].count;
    let loss = wingo2[0].total;
    let losscount = wingo2[0].count;
    let usersOnline = users[0].total;
    let usersOffline = users2[0].total;
    let recharges = recharge[0].total;
    let withdraws = withdraw[0].total;
    return res.status(200).json({
        message: 'Success',
        status: true,
        win: win,
        wincount: wincount,
        loss: loss,
        losscount: losscount,
        usersOnline: usersOnline,
        usersOffline: usersOffline,
        recharges: recharges,
        betToday: (bet_today[0].total),
        bet: (bet[0].total),
        withdraws: withdraws,
        rechargeToday: recharge_today[0].total,
        withdrawToday: withdraw_today[0].total,
        pltoday: (pl_today[0].total),
        pl: (pl[0].total),
    });
}

const changeAdmin = async (req, res) => {
    let auth = req.cookies.auth;
    let value = req.body.value;
    let type = req.body.type;
    let typeid = req.body.typeid;

    if (!value || !type || !typeid) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    let game = '';
    let bs = '';
    if (typeid == '1') {
        game = 'wingo1';
        bs = 'bs1';
    }
    if (typeid == '2') {
        game = 'wingo3';
        bs = 'bs3';
    }
    if (typeid == '3') {
        game = 'wingo5';
        bs = 'bs5'; t
    }
    if (typeid == '4') {
        game = 'wingo10';
        bs = 'bs10';
    }
    switch (type) {
        case 'change-wingo1':
            await connection.query(`UPDATE admin SET ${game} = ? `, [value]);
            return res.status(200).json({
                message: 'Editing results successfully',
                status: true,
                timeStamp: timeNow,
            });
            break;
        case 'change-win_rate':
            await connection.query(`UPDATE admin SET ${bs} = ? `, [value]);
            return res.status(200).json({
                message: 'Editing win rate successfully',
                status: true,
                timeStamp: timeNow,
            });
            break;

        default:
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
            break;
    }

}

function formateT(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin(params = '') {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = Date.now();
        date = new Date(Number(date));
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());
    let weeks = formateT(date.getDay());

    let hours = formateT(date.getHours());
    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());
    // return years + '-' + months + '-' + days + ' ' + hours + '-' + minutes + '-' + seconds;
    return years + " - " + months + " - " + days;
}


const userInfo = async (req, res) => {
    let auth = req.cookies.auth;
    let phone = req.body.phone;
    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let userInfo = user[0];
    // cấp dưới trực tiếp all
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // cấp dưới trực tiếp hôm nay 
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time; // Mã giới thiệu f1
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // tất cả cấp dưới hôm nay 
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const f1_time = f1s[i].time; // time f1
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;
        // tổng f1 mời đc hôm nay
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code; // Mã giới thiệu f2
            const f2_time = f2s[i].time; // time f2
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;
            // tổng f2 mời đc hôm nay
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code; // Mã giới thiệu f3
                const f3_time = f3s[i].time; // time f3
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                // tổng f3 mời đc hôm nay
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code; // Mã giới thiệu f4
                    const f4_time = f4s[i].time; // time f4
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                    // tổng f3 mời đc hôm nay
                }
            }
        }
    }

    // Tổng số f2
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Tổng số f3
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Tổng số f4
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f3_code]);
                if (f4s.length > 0) f4 += f4s.length;
            }
        }
    }
    // console.log("TOTAL_F_TODAY:" + f_all_today);
    // console.log("F1: " + f1s.length);
    // console.log("F2: " + f2);
    // console.log("F3: " + f3);
    // console.log("F4: " + f4);

    const [recharge] = await connection.query('SELECT SUM(`money`) as total FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
    const [withdraw] = await connection.query('SELECT SUM(`money`) as total FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
    const [bank_user] = await connection.query('SELECT * FROM user_bank WHERE phone = ? ', [phone]);
    const [telegram_ctv] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ? ', [userInfo.ctv]);
    const [ng_moi] = await connection.query('SELECT `phone` FROM users WHERE code = ? ', [userInfo.invite]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: user,
        total_r: recharge,
        total_w: withdraw,
        f1: f1s.length,
        f2: f2,
        f3: f3,
        f4: f4,
        bank_user: bank_user,
        telegram: telegram_ctv[0],
        ng_moi: ng_moi[0],
        daily: userInfo.ctv,
    });
}


const editbank = async (req, res) => {
    let id = req.body.phone;
    let name = req.body.names;
    let bank_name = req.body.bank_name;
    let stk = req.body.stk;
    let ifsc = req.body.ifsc;
    try {
        let a = await connection.query('UPDATE user_bank SET name_bank=?,name_user=?,email=?,stk=? WHERE id = ? ', [bank_name, name, ifsc, stk, id]);
        // res.send(id);
        res.redirect('back');
    } catch (e) {
        // console.log(e);
        res.send(e.message);
        // return res.status(200).json({
        //     message: 'Failed',
        //     status: e,
        // }); 
    }
}

const recharge = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let today = req.body.todaydata;
    let wherequery = '';
    // connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 AND today = ?`, [timerJoin2()]);
    if (today == "true") {
        wherequery = 'AND today = "' + timerJoin2() + '"';
    }
    const [recharge] = await connection.query('SELECT * FROM recharge WHERE status = 0 ORDER BY id DESC');
    const [recharge2] = await connection.query('SELECT * FROM recharge WHERE status != 0 ' + wherequery + ' ORDER BY id DESC');
    const [withdraw] = await connection.query('SELECT * FROM withdraw WHERE status = 0 ORDER BY id DESC');
    const [withdraw2] = await connection.query('SELECT * FROM withdraw WHERE status != 0 ' + wherequery + ' ORDER BY id DESC');
    return res.status(200).json({
        todaysstatus: wherequery,
        message: 'Success',
        status: true,
        datas: recharge,
        datas2: recharge2,
        datas3: withdraw,
        datas4: withdraw2,
    });
}
const turnover_report = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [recharge] = await connection.query(`
    SELECT 
        users.*,
        COALESCE(total_deposit, 0) AS total_deposit,
        COALESCE(total_withdrawal, 0) AS total_withdrawal,
        COALESCE(loss, 0) AS loss,
        COALESCE(win, 0) AS win,
        COALESCE(total_bonus, 0) AS total_bonus,
        COALESCE(bets, 0) AS bets
    FROM 
        users
    LEFT JOIN (
        SELECT 
            phone,
            SUM(money) AS total_deposit
        FROM 
            recharge
        WHERE status = 1
        GROUP BY 
            phone
    ) AS recharge ON users.phone = recharge.phone
    LEFT JOIN (
        SELECT 
            phone,
            SUM(money) AS total_withdrawal
        FROM 
            withdraw
        WHERE status = 1
        GROUP BY 
            phone
    ) AS withdraw ON users.phone = withdraw.phone
    LEFT JOIN (
        SELECT 
            phone,
            SUM(\`money\`) AS bets,
            SUM(\`get\`) AS win,
            SUM(\`money\`-\`get\`) AS loss
        FROM 
            minutes_1
        GROUP BY 
            phone
    ) AS minutes_1 ON users.phone = minutes_1.phone
    LEFT JOIN (
        SELECT 
            phone,
            SUM(money) AS total_bonus
        FROM 
            transaction
        GROUP BY 
            phone
    ) AS transaction ON users.phone = transaction.phone ORDER BY users.id DESC`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: recharge
    });
}
const betting_report = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [recharge] = await connection.query(`
      SELECT
          *
      FROM
          minutes_1
      ORDER BY
          id DESC;
    `);
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: recharge
    });
}


const today_report = async (req, res) => {
    let auth = req.cookies.auth;
    let todayDate = req.body.date;
    let type = req.body.type;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    if (type == 'recharge') {
        const [recharge] = await connection.query(`SELECT * FROM recharge WHERE status=? AND DATE(today)=? ORDER BY id DESC;`, [1, todayDate]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            data: recharge,
        });
    }
    if (type == 'withdraw') {
        const [recharge] = await connection.query(`SELECT * FROM withdraw WHERE status=? AND today=? ORDER BY id DESC;`, [1, todayDate]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            data: recharge,
        });
    }
    if (type == 'bet') {
        const [betting] = await connection.query(`SELECT * FROM minutes_1 WHERE today=? ORDER BY id DESC;`, [todayDate]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            data: betting,
        });
    }

    if (type == 'win') {
        const [winner] = await connection.query(`SELECT * FROM minutes_1 WHERE status=? AND today=? ORDER BY id DESC;`, [1, todayDate]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            data: winner,
        });
    }

    if (type == 'loss') {
        const [losser] = await connection.query(`SELECT * FROM minutes_1 WHERE status=? AND today=? ORDER BY id DESC;`, [2, todayDate]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            data: losser,
        });
    }


}

const settingGet = async (req, res) => {
    try {


        let auth = req.cookies.auth;
        if (!auth) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }

        const [bank_recharge] = await connection.query("SELECT * FROM bank_recharge");
        const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'momo'");
        const [settings] = await connection.query('SELECT * FROM admin ');

        let bank_recharge_momo_data
        if (bank_recharge_momo.length) {
            bank_recharge_momo_data = bank_recharge_momo[0]
        }
        return res.status(200).json({
            message: 'Success',
            status: true,
            settings: settings,
            datas: bank_recharge,
            momo: {
                bank_name: bank_recharge_momo_data?.name_bank || "",
                username: bank_recharge_momo_data?.name_user || "",
                upi_id: bank_recharge_momo_data?.stk || "",
                usdt_wallet_address: bank_recharge_momo_data?.qr_code_image || "",
            }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Failed',
            status: false,
        });
    }
}

function calculatesponserRechargeIncome(income) {
    let tax = 0;
    if (income >= 100000) {
        return 11000;
    } else if (income >= 50000) {
        return 7500;
    } else if (income >= 30000) {
        return 3500;
    } else if (income >= 10000) {
        return 2100;
    } else if (income >= 5000) {
        return 1000;
    } else if (income >= 500) {
        return 200;
    } else if (income >= 100) {
        return income * 0.2;
    }
    return tax;
}
function calculateDirectIncome(income) {
    let tax = 0;
    if (income > 50) {
        tax = 30;
    } else if (income > 30) {
        tax = 25;
    } else if (income > 20) {
        tax = 20;
    } else if (income > 10) {
        tax = 15;
    } else {
        tax = 10;
    }
    return tax;
}
const sendLevelIncome = async (phone, money, mm, datetime, purpose1, purpose2, userphones) => {
    let amount = money;
    let refferal = phone;
    let mainUser = await connection.query('SELECT * FROM users WHERE `code` = ? LIMIT 1', [refferal]);
    let purpose = purpose1;
    let teamsize = [0, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 21];
    for (let i = 1; i <= 20; i++) {
        mainUser = await connection.query('SELECT * FROM users WHERE `code` = ? LIMIT 1', [refferal]);
        if (mainUser[0].length > 0) {
            money = (parseFloat(amount / 100) * parseFloat(mm[i])).toFixed(4);
            let userphone = mainUser[0][0].phone;
            if (i > 0) {
                purpose = purpose2;
            }
            // let TotalUser = await connection.query('SELECT COUNT(id) as total FROM users WHERE `invite` = ? ', [mainUser[0][0].code]);
            // if (TotalUser[0][0].total >= teamsize[i] && amount > 0) {
            const sql = `INSERT INTO transaction SET
                purpose = ?,
                phone = ?,
                money = ?,
                type = ?,
                status = ?,
                level = ?,
                today = ?,
                time = ?`;
            await connection.execute(sql, [purpose, userphone, money, 'credit', 1, i, datetime, datetime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [money, money, userphone]);
            // }
            refferal = mainUser[0][0].invite;
        } else {
            refferal = null;
        }
    }
}

const ConfirmRecharge = async (id, callback) => {
    const [info] = await connection.query(`SELECT * FROM recharge WHERE id = ?`, [id]);
    function formateT(params) {
        let result = (params < 10) ? "0" + params : params;
        return result;
    }
    function timerJoin(params = '') {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = new Date();
        }
        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());
        return years + '-' + months + '-' + days;
    }
    let time = new Date().getTime();
    let checkTime = timerJoin(time);
    const [UserInfo] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [info[0].phone]);
    const [Firstrecharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? ', [info[0].phone, 1]);
    // return res.status(404).json({
    //     message: Firstrecharge,

    //     status: false,
    // });

    if (Firstrecharge.length == 0) {
        let refferal = UserInfo[0].invite;
        try {
            var currentDate = new Date();
            var givenDate = new Date(UserInfo[0].create_at);
            if (info[0].money >= 1000 && currentDate.toDateString() === givenDate.toDateString()) {
                await connection.query('UPDATE users SET total_reffer_today = total_reffer_today + 1 WHERE code = ? ', [refferal]);
            }
            let bonus = calculatesponserRechargeIncome(info[0].money);
            let final_money = (bonus);
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            today = ?,
            time = ?`;
            let mainUser = await connection.query('SELECT * FROM users WHERE `code` = ? LIMIT 1', [refferal]);

            // return res.status(403).json({
            //     status: true,
            //     amount: refferal,
            //     mainUser: mainUser
            // });
            if (mainUser[0].length > 0) {
                let refferphone = mainUser[0][0].phone;
                let total_reffer_today = mainUser[0][0].total_reffer_today;
                await connection.execute(sql, ['Sponser Bonus', refferphone, final_money, 'credit', 1, checkTime, checkTime]);
                await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [final_money, final_money, refferphone]);
                if (total_reffer_today == 3) {
                    let moneys = 400;
                    const sql = `INSERT INTO transaction SET
                    purpose = ?,
                    phone = ?,
                    money = ?,
                    type = ?,
                    status = ?,
                    level = ?,
                    today = ?,
                    time = ?`;
                    await connection.execute(sql, ['Level Recharge Bonus', mainUser[0][0].phone, moneys, 'credit', 1, 1, checkTime, checkTime]);
                    // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
                    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [moneys, moneys, mainUser[0][0].phone]);
                }
            }
            // let zeroLevel = 10;
            // let ZeroLevelUserCount = await connection.query('SELECT * FROM users WHERE `code` = ? ', [info[0].invite]);
            // zeroLevel = calculateDirectIncome(ZeroLevelUserCount.length);
            // let levelIncomePercentage = [0, 2, 1, 0.5, 0.2, 0.15, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.15, 0.25, 0.5, 1];
            // // console.log(UserInfo[0].invite, info[0].money, levelIncomePercentage, checkTime, 'direct_recharge', 'level_recharge');
            // // (phone, money, mm, datetime, purpose1, purpose2,userphones)
            // await sendLevelIncome(UserInfo[0].invite, info[0].money, levelIncomePercentage, checkTime, 'direct_recharge', 'level_recharge',UserInfo[0].phone);
        } catch (e) {
            return res.status(403).json({
                message: e,
            });
        }
    }

    if (Firstrecharge.length == 0) {
        if (info[0].money >= 50000) {
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
            let bon = 20000;
            await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
        }
        else if (info[0].money >= 10000) {
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
            let bon = 3000;
            await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
        }
        else if (info[0].money >= 5000) {
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
            let bon = 1000;
            await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
        } else if (info[0].money >= 1000) {
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
            let bon = 200;
            await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
        }
        else if (info[0].money >= 500) {
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
            let bon = 50;
            await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
        }
        else if (info[0].money >= 250) {
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
            let bon = 20;
            await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
            // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
        }
    }
    await connection.query(`UPDATE recharge SET status = 1 WHERE id = ?`, [id]);
    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [info[0].money, info[0].money, info[0].phone]);
    callback({
        message: 'Application confirmed successfully',
        status: true,
        datas: recharge,
    });
}

const ConfirmRechargeold = async (id, callback) => {
    const [info] = await connection.query(`SELECT * FROM recharge WHERE id = ?`, [id]);
    function formateT(params) {
        let result = (params < 10) ? "0" + params : params;
        return result;
    }
    function timerJoin(params = '') {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = new Date();
        }
        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());
        return years + '-' + months + '-' + days;
    }
    let time = new Date().getTime();
    let checkTime = timerJoin(time);
    const [UserInfo] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [info[0].phone]);
    const [Firstrecharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? ', [info[0].phone, 1]);
    // return res.status(404).json({
    //     message: Firstrecharge,

    //     status: false,
    // });

    if (Firstrecharge.length == 0) {
        let refferal = UserInfo[0].invite;
        try {
            var currentDate = new Date();
            var givenDate = new Date(UserInfo[0].create_at);
            if (info[0].money >= 1000 && currentDate.toDateString() === givenDate.toDateString()) {
                await connection.query('UPDATE users SET total_reffer_today = total_reffer_today + 1 WHERE code = ? ', [refferal]);
            }
            let bonus = calculatesponserRechargeIncome(info[0].money);
            let final_money = (bonus);
            const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            today = ?,
            time = ?`;
            let mainUser = await connection.query('SELECT * FROM users WHERE `code` = ? LIMIT 1', [refferal]);

            // return res.status(403).json({
            //     status: true,
            //     amount: refferal,
            //     mainUser: mainUser
            // });
            if (mainUser[0].length > 0) {
                let refferphone = mainUser[0][0].phone;
                let total_reffer_today = mainUser[0][0].total_reffer_today;
                await connection.execute(sql, ['Sponser Bonus', refferphone, final_money, 'credit', 1, checkTime, checkTime]);
                await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [final_money, final_money, refferphone]);
                if (total_reffer_today == 3) {
                    let moneys = 400;
                    const sql = `INSERT INTO transaction SET
                    purpose = ?,
                    phone = ?,
                    money = ?,
                    type = ?,
                    status = ?,
                    level = ?,
                    today = ?,
                    time = ?`;
                    await connection.execute(sql, ['Level Recharge Bonus', mainUser[0][0].phone, moneys, 'credit', 1, 1, checkTime, checkTime]);
                    // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
                    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [moneys, moneys, mainUser[0][0].phone]);
                }
            }
            // let zeroLevel = 10;
            // let ZeroLevelUserCount = await connection.query('SELECT * FROM users WHERE `code` = ? ', [info[0].invite]);
            // zeroLevel = calculateDirectIncome(ZeroLevelUserCount.length);
            // let levelIncomePercentage = [0, 2, 1, 0.5, 0.2, 0.15, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.15, 0.25, 0.5, 1];
            // // console.log(UserInfo[0].invite, info[0].money, levelIncomePercentage, checkTime, 'direct_recharge', 'level_recharge');
            // // (phone, money, mm, datetime, purpose1, purpose2,userphones)
            // await sendLevelIncome(UserInfo[0].invite, info[0].money, levelIncomePercentage, checkTime, 'direct_recharge', 'level_recharge',UserInfo[0].phone);
        } catch (e) {
            return res.status(403).json({
                message: e,
            });
        }
    }

    if (info[0].money >= 50000) {
        const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
        let bon = info[0].money * 0.06;
        await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
        // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
    } else if (info[0].money >= 30000) {
        const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
        let bon = info[0].money * 0.05;
        await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
        // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
    } else if (info[0].money >= 20000) {
        const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
        let bon = info[0].money * 0.04;
        await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
        // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
    } else if (info[0].money >= 10000) {
        const sql = `INSERT INTO transaction SET
            purpose = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            level = ?,
            today = ?,
            time = ?`;
        let bon = info[0].money * 0.03;
        await connection.execute(sql, ['Big Recharge Bonus', info[0].phone, bon, 'credit', 1, 1, checkTime, checkTime]);
        // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [bon, bon, info[0].phone]);
    }
    await connection.query(`UPDATE recharge SET status = 1 WHERE id = ?`, [id]);
    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [info[0].money, info[0].money, info[0].phone]);
    callback({
        message: 'Application confirmed successfully',
        status: true,
        datas: recharge,
    });
}
const rechargeDuyet = async (req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id || !type) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'confirm') {
        await ConfirmRecharge(id, function (data) {
            return res.status(200).json(data);
        });
    }
    if (type == 'delete') {
        await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

        return res.status(200).json({
            message: 'Order canceled successfully',
            status: true,
            datas: recharge,
        });
    }
}

const handlWithdraw = async (req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id || !type) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'confirm') {
        await connection.query(`UPDATE withdraw SET status = 1 WHERE id = ?`, [id]);
        const [info] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        return res.status(200).json({
            message: 'Xác nhận đơn thành công',
            status: true,
            datas: recharge,
        });
    }
    if (type == 'delete') {
        await connection.query(`UPDATE withdraw SET status = 2 WHERE id = ?`, [id]);
        const [info] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [info[0].money, info[0].phone]);
        return res.status(200).json({
            message: 'Hủy thành công',
            status: true,
            datas: recharge,
        });
    }
}
const deleteBankRechargeById = async (id) => {
    const [recharge] = await connection.query("DELETE FROM bank_recharge WHERE type = 'momo' AND id = ?", [id]);

    return recharge
}

const settingBank = async (req, res) => {
    try {


        let auth = req.cookies.auth;
        let name_bank = req.body.name_bank;
        let name = req.body.name;
        let info = req.body.info;
        let qr = req.body.qr;
        let typer = req.body.typer;
        let accountNumber = req.body.accountNumber;
        if (!auth || !typer) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (typer == 'bank') {
            await connection.query(`UPDATE bank_recharge SET name_bank = ?, name_user = ?, stk = ? WHERE type = 'bank'`, [name_bank, name, info]);
            return res.status(200).json({
                message: 'Successful change',
                status: true,
                datas: recharge,
            });
        }

        if (typer == 'momo') {
            const [bank_recharge] = await connection.query(`SELECT * FROM bank_recharge WHERE type = 'momo'`);

            const deleteRechargeQueries = bank_recharge.map(recharge => {
                return deleteBankRechargeById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)

            // await connection.query(`UPDATE bank_recharge SET name_bank = ?, name_user = ?, stk = ?, qr_code_image = ? WHERE type = 'upi'`, [name_bank, name, info, qr]);

            const bankName = req.body.bank_name
            const username = req.body.username
            const ifsc = req.body.ifsc || 121
            const upiId = req.body.upi_id
            const usdtWalletAddress = req.body.usdt_wallet_address
            await connection.query(`
                UPDATE bank_recharge 
                SET 
                    name_bank = ?,
                    ifsc = ?,
                     name_user = ?, 
                    stk = ?,
                    usdt = ?,
                    accountNumber = ?
                WHERE
                    type = 'upi'
            `, [
                bankName,
                ifsc,
                username,
                upiId,
                usdtWalletAddress,
                accountNumber
            ]); 
            return res.status(200).json({
                message: 'Successfully changed',
                status: true,
                datas: recharge,
            });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Something went wrong!',
            status: false,
        });
    }
}

const settingCskh = async (req, res) => {
    let auth = req.cookies.auth;
    let telegram = req.body.telegram;
    let cskh = req.body.cskh;
    let myapp_web = req.body.myapp_web;
    if (!auth || !cskh || !telegram) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    await connection.query(`UPDATE admin SET telegram = ?, cskh = ?, app = ?`, [telegram, cskh, myapp_web]);
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}
const settingMessage = async (req, res) => {
    let auth = req.cookies.auth;
    let telegram = req.body.message;
    if (!auth || !telegram) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    await connection.query(`UPDATE admin SET message = ?`, [telegram]);
    return res.status(200).json({
        message: 'Success',
        status: true,
    });
}

const banned = async (req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'open') {
        await connection.query(`UPDATE users SET status = 1 WHERE id = ?`, [id]);
    }
    if (type == 'close') {
        await connection.query(`UPDATE users SET status = 2 WHERE id = ?`, [id]);
    }
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}


const createBonus = async (req, res) => {
    const randomString = (length) => {
        var result = '';
        var characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }
    function timerJoin(params = '') {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = Date.now();
            date = new Date(Number(date));
        }
        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());
        let weeks = formateT(date.getDay());

        let hours = formateT(date.getHours());
        let minutes = formateT(date.getMinutes());
        let seconds = formateT(date.getSeconds());
        // return years + '-' + months + '-' + days + ' ' + hours + '-' + minutes + '-' + seconds;
        return years + "" + months + "" + days;
    }
    const d = new Date();
    const time = d.getTime();

    let auth = req.cookies.auth;
    let money = req.body.money;
    let type = req.body.type;


    if (!money || !auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [user] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let userInfo = user[0];

    if (type == 'all') {
        let select = req.body.select;
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money = money + ? WHERE level = 2`, [money]);
            await connection.query(`UPDATE users SET money = money + ? WHERE level = 2`, [money]);
        } else {
            await connection.query(`UPDATE point_list SET money = money - ? WHERE level = 2`, [money]);
            await connection.query(`UPDATE users SET money = money - ? WHERE level = 2`, [money]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    // if (type == 'two') {
    //     let select = req.body.select;
    //     if (select == '1') {
    //         await connection.query(`UPDATE point_list SET money_us = money_us + ? WHERE level = 2`, [money]);
    //     } else {
    //         await connection.query(`UPDATE point_list SET money_us = money_us - ? WHERE level = 2`, [money]);
    //     }
    //     return res.status(200).json({
    //         message: 'successful change',
    //         status: true,
    //     });
    // }

    // if (type == 'one') {
    //     let select = req.body.select;
    //     let phone = req.body.phone;
    //     const [user] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
    //     if (user.length == 0) {
    //         return res.status(200).json({
    //             message: 'Failed',
    //             status: false,
    //             timeStamp: timeNow,
    //         });
    //     }
    //     if (select == '1') {
    //         await connection.query(`UPDATE point_list SET money = money + ? WHERE level = 2 and phone = ?`, [money, phone]);
    //     } else {
    //         await connection.query(`UPDATE point_list SET money = money - ? WHERE level = 2 and phone = ?`, [money, phone]);
    //     }
    //     return res.status(200).json({
    //         message: 'successful change',
    //         status: true,
    //     });
    // }

    if (type == 'three') {
        let select = req.body.select;
        let phone = req.body.phone;
        const [user] = await connection.query('SELECT * FROM users WHERE phone = ? and level=2', [phone]);
        if (user.length == 0) {
            return res.status(200).json({
                message: 'account does not exist',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money_us = money_us + ? WHERE level = 2 and phone = ?`, [money, phone]);
            await connection.query(`UPDATE users SET money = money + ? WHERE level = 2 and phone = ?`, [money, phone]);
        } else {
            await connection.query(`UPDATE point_list SET money_us = money_us - ? WHERE level = 2 and phone = ?`, [money, phone]);
            await connection.query(`UPDATE users SET money = money - ? WHERE level = 2 and phone = ?`, [money, phone]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (!type) {
        let id_redenvelops = String(timerJoin()) + randomString(16);
        let sql = `INSERT INTO redenvelopes SET id_redenvelope = ?, phone = ?, money = ?, used = ?, amount = ?, status = ?, time = ?`;
        await connection.query(sql, [id_redenvelops, userInfo.phone, money, 1, 1, 0, time]);
        return res.status(200).json({
            message: 'Successful change',
            status: true,
            id: id_redenvelops,
        });
    }
}

const listRedenvelops = async (req, res) => {
    let auth = req.cookies.auth;

    let [redenvelopes] = await connection.query('SELECT * FROM redenvelopes WHERE status = 0 ');
    return res.status(200).json({
        message: 'Successful change',
        status: true,
        redenvelopes: redenvelopes,
    });
}

const settingbuff = async (req, res) => {
    let auth = req.cookies.auth;
    let id_user = req.body.id_user;
    let buff_acc = req.body.buff_acc;
    let money_value = req.body.money_value;
    if (!id_user || !buff_acc || !money_value) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [user_id] = await connection.query(`SELECT * FROM users WHERE id_user = ?`, [id_user]);

    if (user_id.length > 0) {
        if (buff_acc == '1') {
            await connection.query(`UPDATE users SET money = money + ? WHERE id_user = ?`, [money_value, id_user]);
        }
        if (buff_acc == '2') {
            await connection.query(`UPDATE users SET money = money - ? WHERE id_user = ?`, [money_value, id_user]);
        }
        return res.status(200).json({
            message: 'Successful change',
            status: true,
        });
    } else {
        return res.status(200).json({
            message: 'Successful change',
            status: false,
        });
    }
}
const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

const randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

const ipAddress = (req) => {
    let ip = '';
    if (req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'].split(",")[0];
    } else if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    } else {
        ip = req.ip;
    }
    return ip;
}

const timeCreate = () => {
    const d = new Date();
    const time = d.getTime();
    return time;
}



const register = async (req, res) => {
    let { username, password, invitecode } = req.body;
    let id_user = randomNumber(10000, 99999);
    let name_user = "Member" + randomNumber(10000, 99999);
    let code = randomString(5) + randomNumber(10000, 99999);
    let ip = ipAddress(req);
    let time = timeCreate();
    try {

        invitecode = '2cOCs36373';

        if (!username || !password || !invitecode) {
            return res.status(200).json({
                message: 'ERROR!!!',
                status: false
            });
        }

        if (!username) {
            return res.status(200).json({
                message: 'phone error',
                status: false
            });
        }

        const [check_u] = await connection.query('SELECT * FROM users WHERE phone = ? ', [username]);
        if (check_u.length == 1) {
            return res.status(200).json({
                message: 'register account', //Số điện thoại đã được đăng ký
                status: false
            });
        } else {
            const sql = `INSERT INTO users SET 
            id_user = ?,
            token=?,
            phone = ?,
            name_user = ?,
            password = ?,
            money = ?,
            level = ?,
            code = ?,
            invite = ?,
            veri = ?,
            ip_address = ?,
            status = ?,
            time = ?`;
            await connection.execute(sql, [id_user, username, username, name_user, md5(password), 0, 2, code, invitecode, 1, ip, 1, time]);
            await connection.execute('INSERT INTO point_list SET phone = ?, level = 2', [username]);
            return res.status(200).json({
                message: 'registration success',//Register Sucess
                status: true
            });
        }
    } catch (error) {
        return res.status(200).json({
            message: error,//Register Sucess
            status: true
        });
        if (error) console.log(error);
    }

}

const profileUser = async (req, res) => {
    let phone = req.body.phone;
    if (!phone) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
            timeStamp: timeNow,
        });
    }
    let [user] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
            timeStamp: timeNow,
        });
    }
    let [recharge] = await connection.query(`SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC LIMIT 10`, [phone]);
    let [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC LIMIT 10`, [phone]);
    return res.status(200).json({
        message: 'Nhận thành công',
        status: true,
        recharge: recharge,
        withdraw: withdraw,
    });
}

const infoCtv = async (req, res) => {
    const phone = req.body.phone;

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
        });
    }
    let userInfo = user[0];
    // cấp dưới trực tiếp all
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // cấp dưới trực tiếp hôm nay 
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time; // Mã giới thiệu f1
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // tất cả cấp dưới hôm nay 
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const f1_time = f1s[i].time; // time f1
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;
        // tổng f1 mời đc hôm nay
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code; // Mã giới thiệu f2
            const f2_time = f2s[i].time; // time f2
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;
            // tổng f2 mời đc hôm nay
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code; // Mã giới thiệu f3
                const f3_time = f3s[i].time; // time f3
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                // tổng f3 mời đc hôm nay
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code; // Mã giới thiệu f4
                    const f4_time = f4s[i].time; // time f4
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                    // tổng f3 mời đc hôm nay
                }
            }
        }
    }

    // Tổng số f2
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Tổng số f3
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Tổng số f4
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f3_code]);
                if (f4s.length > 0) f4 += f4s.length;
            }
        }
    }

    const [list_mem] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);
    const [list_mem_baned] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 2 AND veri = 1 ', [phone]);
    let total_recharge = 0;
    let total_withdraw = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge] = await connection.query('SELECT SUM(money) as money FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw] = await connection.query('SELECT SUM(money) as money FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        if (recharge[0].money) {
            total_recharge += Number(recharge[0].money);
        }
        if (withdraw[0].money) {
            total_withdraw += Number(withdraw[0].money);
        }
    }

    let total_recharge_today = 0;
    let total_withdraw_today = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                total_recharge_today += recharge_today[i].money;
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                total_withdraw_today += withdraw_today[i].money;
            }
        }
    }

    let win = 0;
    let loss = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [wins] = await connection.query('SELECT `money`, `time` FROM minutes_1 WHERE phone = ? AND status = 1 ', [phone]);
        const [losses] = await connection.query('SELECT `money`, `time` FROM minutes_1 WHERE phone = ? AND status = 2 ', [phone]);
        for (let i = 0; i < wins.length; i++) {
            let today = timerJoin();
            let time = timerJoin(wins[i].time);
            if (time == today) {
                win += wins[i].money;
            }
        }
        for (let i = 0; i < losses.length; i++) {
            let today = timerJoin();
            let time = timerJoin(losses[i].time);
            if (time == today) {
                loss += losses[i].money;
            }
        }
    }
    let list_mems = [];
    const [list_mem_today] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);
    for (let i = 0; i < list_mem_today.length; i++) {
        let today = timerJoin();
        let time = timerJoin(list_mem_today[i].time);
        if (time == today) {
            list_mems.push(list_mem_today[i]);
        }
    }

    const [point_list] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
    let moneyCTV = point_list[0].money;

    let list_recharge_news = [];
    let list_withdraw_news = [];
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `id`, `status`, `type`,`phone`, `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `id`, `status`,`phone`, `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                list_recharge_news.push(recharge_today[i]);
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                list_withdraw_news.push(withdraw_today[i]);
            }
        }
    }

    const [redenvelopes_used] = await connection.query('SELECT * FROM redenvelopes_used WHERE phone = ? ', [phone]);
    let redenvelopes_used_today = [];
    for (let i = 0; i < redenvelopes_used.length; i++) {
        let today = timerJoin();
        let time = timerJoin(redenvelopes_used[i].time);
        if (time == today) {
            redenvelopes_used_today.push(redenvelopes_used[i]);
        }
    }

    const [financial_details] = await connection.query('SELECT * FROM financial_details WHERE phone = ? ', [phone]);
    let financial_details_today = [];
    for (let i = 0; i < financial_details.length; i++) {
        let today = timerJoin();
        let time = timerJoin(financial_details[i].time);
        if (time == today) {
            financial_details_today.push(financial_details[i]);
        }
    }

    // let tcomm = await connection.query('SELECT SUM(money) as income FROM transaction WHERE phone=? and today=? and purpose IN ("Sponser Bonus","Level Recharge Bonus","level_water","Big Recharge Bonus","salery")',[phone,getCurrentDate()]);
    // let comm = await connection.query('SELECT SUM(money) as income FROM transaction WHERE phone=? and purpose IN ("Sponser Bonus","Level Recharge Bonus","level_water","Big Recharge Bonus","salery")',[phone]);
    // console.log(tcomm[0]);
    const [teamcommission] = await connection.query('SELECT SUM(money) as bonus FROM transaction WHERE phone = ? ', [phone]);
    const [teamcommissionT] = await connection.query('SELECT SUM(money) as bonus FROM transaction WHERE phone = ? and DATE(today) = CURRENT_DATE', [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        totalcommission: teamcommission.length > 0 ? teamcommission[0].bonus : 0,
        todaycommission: teamcommissionT.length > 0 ? teamcommissionT[0].bonus : 0,
        datas: user,
        f1: f1s.length,
        f2: f2,
        f3: f3,
        f4: f4,
        list_mems: list_mems,
        total_recharge: total_recharge,
        total_withdraw: total_withdraw,
        total_recharge_today: total_recharge_today,
        total_withdraw_today: total_withdraw_today,
        list_mem_baned: list_mem_baned.length,
        win: win,
        loss: loss,
        list_recharge_news: list_recharge_news,
        list_withdraw_news: list_withdraw_news,
        moneyCTV: moneyCTV,
        redenvelopes_used: redenvelopes_used_today,
        financial_details_today: financial_details_today,
    });
}

const infoCtv2 = async (req, res) => {
    const phone = req.body.phone;
    const timeDate = req.body.timeDate;

    function timerJoin(params = '') {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = Date.now();
            date = new Date(Number(date));
        }
        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());
        let weeks = formateT(date.getDay());

        let hours = formateT(date.getHours());
        let minutes = formateT(date.getMinutes());
        let seconds = formateT(date.getSeconds());
        // return years + '-' + months + '-' + days + ' ' + hours + '-' + minutes + '-' + seconds;
        return years + "-" + months + "-" + days;
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
        });
    }
    let userInfo = user[0];
    const [list_mem] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);

    let list_mems = [];
    const [list_mem_today] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);
    for (let i = 0; i < list_mem_today.length; i++) {
        let today = timeDate;
        let time = timerJoin(list_mem_today[i].time);
        if (time == today) {
            list_mems.push(list_mem_today[i]);
        }
    }

    let list_recharge_news = [];
    let list_withdraw_news = [];
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `id`, `status`, `type`,`phone`, `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `id`, `status`,`phone`, `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timeDate;
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                list_recharge_news.push(recharge_today[i]);
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timeDate;
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                list_withdraw_news.push(withdraw_today[i]);
            }
        }
    }

    const [redenvelopes_used] = await connection.query('SELECT * FROM redenvelopes_used WHERE phone = ? ', [phone]);
    let redenvelopes_used_today = [];
    for (let i = 0; i < redenvelopes_used.length; i++) {
        let today = timeDate;
        let time = timerJoin(redenvelopes_used[i].time);
        if (time == today) {
            redenvelopes_used_today.push(redenvelopes_used[i]);
        }
    }

    const [financial_details] = await connection.query('SELECT * FROM financial_details WHERE phone = ? ', [phone]);
    let financial_details_today = [];
    for (let i = 0; i < financial_details.length; i++) {
        let today = timeDate;
        let time = timerJoin(financial_details[i].time);
        if (time == today) {
            financial_details_today.push(financial_details[i]);
        }
    }

    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: user,
        list_mems: list_mems,
        list_recharge_news: list_recharge_news,
        list_withdraw_news: list_withdraw_news,
        redenvelopes_used: redenvelopes_used_today,
        financial_details_today: financial_details_today,
    });
}

const listRechargeMem = async (req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM recharge WHERE phone = ?`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: recharge,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listWithdrawMem = async (req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM withdraw WHERE phone = ?`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: withdraw,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listRedenvelope = async (req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [redenvelopes_used] = await connection.query(`SELECT * FROM redenvelopes_used WHERE phone_used = ? ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM redenvelopes_used WHERE phone_used = ?`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: redenvelopes_used,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const CreatedSalary = async (req, res) => {
    try {
        const phone = req.body.phone;
        const amount = req.body.amount;
        const type = req.body.type;
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        // Check if the phone number is a 10-digit number
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                message: 'ERROR!!! Invalid phone number. Please provide a 10-digit phone number.',
                status: false
            });
        }

        // Check if user with the given phone number exists
        const checkUserQuery = 'SELECT * FROM `users` WHERE phone = ?';
        const [existingUser] = await connection.execute(checkUserQuery, [phone]);

        if (existingUser.length === 0) {
            // If user doesn't exist, return an error
            return res.status(400).json({
                message: 'ERROR!!! User with the provided phone number does not exist.',
                status: false
            });
        }

        // If user exists, update the 'users' table
        const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
        await connection.execute(updateUserQuery, [amount, phone]);


        // Insert record into 'salary' table
        const insertSalaryQuery = 'INSERT INTO salary (phone, amount, type, time) VALUES (?, ?, ?, ?)';
        await connection.execute(insertSalaryQuery, [phone, amount, type, formattedTime]);

        res.status(200).json({ message: 'Salary record created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getSalary = async (req, res) => {
    const [rows] = await connection.query(`SELECT * FROM salary ORDER BY time DESC`);

    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: rows
    })
};

const listBet = async (req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [listBet] = await connection.query(`SELECT * FROM minutes_1 WHERE phone = ? AND status != 0 ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM minutes_1 WHERE phone = ? AND status != 0`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: listBet,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listOrderOld = async (req, res) => {
    let { gameJoin } = req.body;

    let checkGame = ['1', '3', '5', '10'].includes(String(gameJoin));
    if (!checkGame) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    let game = Number(gameJoin);

    let join = '';
    if (game == 1) join = 'k5d';
    if (game == 3) join = 'k5d3';
    if (game == 5) join = 'k5d5';
    if (game == 10) join = 'k5d10';

    const [k5d] = await connection.query(`SELECT * FROM 5d WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `);
    const [period] = await connection.query(`SELECT period FROM 5d WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    const [waiting] = await connection.query(`SELECT phone, money, price, amount, bet FROM result_5d WHERE status = 0 AND level = 0 AND game = '${game}' ORDER BY id ASC `);
    const [settings] = await connection.query(`SELECT ${join} FROM admin`);
    if (k5d.length == 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!k5d[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: false
        });
    }
    return res.status(200).json({
        code: 0,
        msg: "Nhận thành công",
        data: {
            gameslist: k5d,
        },
        bet: waiting,
        settings: settings,
        join: join,
        period: period[0].period,
        status: true
    });
}

const listOrderOldK3 = async (req, res) => {
    let { gameJoin } = req.body;

    let checkGame = ['1', '3', '5', '10'].includes(String(gameJoin));
    if (!checkGame) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    let game = Number(gameJoin);

    let join = '';
    if (game == 1) join = 'k3d';
    if (game == 3) join = 'k3d3';
    if (game == 5) join = 'k3d5';
    if (game == 10) join = 'k3d10';

    const [k5d] = await connection.query(`SELECT * FROM k3 WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `);
    const [period] = await connection.query(`SELECT period FROM k3 WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    const [waiting] = await connection.query(`SELECT phone, money, price, typeGame, amount, bet FROM result_k3 WHERE status = 0 AND level = 0 AND game = '${game}' ORDER BY id ASC `);
    const [settings] = await connection.query(`SELECT ${join} FROM admin`);
    if (k5d.length == 0) {
        return res.status(200).json({
            code: 0,
            msg: "Không còn dữ liệu",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!k5d[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: false
        });
    }
    return res.status(200).json({
        code: 0,
        msg: "Nhận thành công",
        data: {
            gameslist: k5d,
        },
        bet: waiting,
        settings: settings,
        join: join,
        period: period[0].period,
        status: true
    });
}

const editResult = async (req, res) => {
    let { game, list } = req.body;

    if (!list || !game) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    let join = '';
    if (game == 1) join = 'k5d';
    if (game == 3) join = 'k5d3';
    if (game == 5) join = 'k5d5';
    if (game == 10) join = 'k5d10';

    const sql = `UPDATE admin SET ${join} = ?`;
    await connection.execute(sql, [list]);
    return res.status(200).json({
        message: 'Chỉnh sửa thành công',//Register Sucess
        status: true
    });

}

const editResult2 = async (req, res) => {
    let { game, list } = req.body;

    if (!list || !game) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    let join = '';
    if (game == 1) join = 'k3d';
    if (game == 3) join = 'k3d3';
    if (game == 5) join = 'k3d5';
    if (game == 10) join = 'k3d10';

    const sql = `UPDATE admin SET ${join} = ?`;
    await connection.execute(sql, [list]);
    return res.status(200).json({
        message: 'Chỉnh sửa thành công',//Register Sucess
        status: true
    });

}
const todayrechargeexport = async (req, res) => {
    const today = req.query.today && req.query.today != '' ? req.query.today : timerJoin2();
    const purpose = req.query.purpose;
    let query;
    let allparameter = [];
    try {
        if (purpose == "todayrecharge") {
            query = 'SELECT * FROM recharge WHERE date(today)=?';
            allparameter = [today];
        } else if (purpose == "totalrecharge") {
            query = 'SELECT * FROM recharge';
        } else if (purpose == "totalwithdarwal") {
            query = 'SELECT * FROM withdraw';
        } else if (purpose == "todaywithdarwal") {
            query = 'SELECT * FROM withdraw WHERE date(today)=?';
            allparameter = [today];
        } else if (purpose == "todaybetting") {
            query = 'SELECT * FROM minutes_1 WHERE date(today)=?';
            allparameter = [today];
        } else if (purpose == "totalbetting") {
            query = 'SELECT * FROM minutes_1';
        }
        const [rows] = await connection.query(query, allparameter);
        if (!rows || rows[0].length <= 0) {
            return res.status(404).json({ message: 'No data found' });
        }
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Add column headers
        const columns = Object.keys(rows[0]);
        worksheet.addRow(columns);

        // Add rows from the database result
        rows.forEach(row => {
            worksheet.addRow(Object.values(row));
        });

        // Generate a unique file name
        const fileName = `data_${Date.now()}.xlsx`;
        const filePath = `./exports/${fileName}`; // Update with your desired file path

        // Create the 'exports' directory if it doesn't exist
        if (!fs.existsSync('./exports')) {
            fs.mkdirSync('./exports');
        }

        // Write the workbook to a file
        await workbook.xlsx.writeFile(filePath);

        // Set the response headers for file download
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Stream the file to the client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Delete the file after it's downloaded
        fileStream.on('end', () => {
            fs.unlinkSync(filePath);
            console.log('File downloaded and deleted successfully');
        });
    } catch (error) {
        console.log('Error exporting to Excel: ' + error);
        res.status(500).json({ message: 'Error exporting to Excel' });
    }
};

const getLevelInfo = async (req, res) => {

    const [rows] = await connection.query('SELECT * FROM `level`');

    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: rows
    });

    // const [recharge] = await connection.query('SELECT * FROM recharge WHERE `phone` = ? AND status = 1', [rows[0].phone]);
    // let totalRecharge = 0;
    // recharge.forEach((data) => {
    //     totalRecharge += data.money;
    // });
    // const [withdraw] = await connection.query('SELECT * FROM withdraw WHERE `phone` = ? AND status = 1', [rows[0].phone]);
    // let totalWithdraw = 0;
    // withdraw.forEach((data) => {
    //     totalWithdraw += data.money;
    // });

    // const { id, password, ip, veri, ip_address, status, time, token, ...others } = rows[0];
    // return res.status(200).json({
    //     message: 'Success',
    //     status: true,
    //     data: {
    //         code: others.code,
    //         id_user: others.id_user,
    //         name_user: others.name_user,
    //         phone_user: others.phone,
    //         money_user: others.money,
    //     },
    //     totalRecharge: totalRecharge,
    //     totalWithdraw: totalWithdraw,
    //     timeStamp: timeNow,
    // });
}
const CreatedSalaryRecord = async (req, res) => {
    return res.render("manage/CreatedSalaryRecord.ejs");
}

const levelSetting = async (req, res) => {
    return res.render("manage/levelSetting.ejs");
}
const updateLevel = async (req, res) => {
    try {
        let id = req.body.id;
        let f1 = req.body.f1;
        let f2 = req.body.f2;
        let f3 = req.body.f3;
        let f4 = req.body.f4;

        console.log("level : " + id, f1, f2, f3, f4);

        await connection.query(
            'UPDATE `level` SET `f1`= ? ,`f2`= ? ,`f3`= ? ,`f4`= ?  WHERE `id` = ?',
            [f1, f2, f3, f4, id]
        );

        // Send a success response to the client
        res.status(200).json({
            message: 'Update successful',
            status: true,
        });
    } catch (error) {
        console.error('Error updating level:', error);

        // Send an error response to the client
        res.status(500).json({
            message: 'Update failed',
            status: false,
            error: error.message,
        });
    }
};
module.exports = {
    todayrechargeexport,
    adminPage,
    adminPage3,
    adminPage5,
    adminPage10,
    totalJoin,
    middlewareAdminController,
    changeAdmin,
    membersPage,
    listMember,
    infoMember,
    todayreport,
    userInfo,
    turnover,
    statistical,
    statistical2,
    rechargePage,
    recharge,
    rechargeDuyet,
    rechargeRecord,
    withdrawRecord,
    withdraw,
    handlWithdraw,
    settings,
    editResult2,
    settingBank,
    settingGet,
    settingCskh,
    settingbuff,
    register,
    ctvPage,
    listCTV,
    profileUser,
    ctvProfilePage,
    infoCtv,
    betting,
    infoCtv2,
    giftPage,
    AgentCommission,
    createBonus,
    listRedenvelops,
    rechargeCallback,
    banned,
    editbank,
    listWithdrawMem,
    listRedenvelope,
    adminPage5d,
    listOrderOld,
    listOrderOldK3,
    settingMessage,
    editResult,
    adminPageK3,
    adminPage,
    turnover_report,
    today_report,
    betting_report,
    adminPage3,
    todayrechargeexport,
    adminPage5,
    adminPage10,
    totalJoin,
    middlewareAdminController,
    changeAdmin,
    membersPage,
    listMember,
    infoMember,
    userInfo,
    statistical,
    statistical2,
    rechargePage,
    recharge,
    rechargeDuyet,
    rechargeRecord,
    withdrawRecord,
    withdraw,
    levelSetting,
    handlWithdraw,
    settings,
    editResult2,
    settingBank,
    settingGet,
    settingCskh,
    settingbuff,
    register,
    ctvPage,
    listCTV,
    profileUser,
    ctvProfilePage,
    infoCtv,
    infoCtv2,
    giftPage,
    createBonus,
    listRedenvelops,
    listRechargeMem,
    listWithdrawMem,
    getLevelInfo,
    listBet,
    listOrderOld,
    listOrderOldK3,
    editResult,
    adminPageK3,
    updateLevel,
    settingMessage,
    CreatedSalaryRecord,
    CreatedSalary,
    getSalary,
    betting,
    todayreport,
    turnover,
}