import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from 'request';
import e from "express";
require('dotenv').config();

let timeNow = Date.now();

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


const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

const isNumber = (params) => {
    let pattern = /^[0-9]*\d$/;
    return pattern.test(params);
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

const loginPage = async (req, res) => {
    return res.render("account/login.ejs");
}

const registerPage = async (req, res) => {
    return res.render("account/register.ejs");
}

const forgotPage = async (req, res) => {
    return res.render("account/forgot.ejs");
}

const curtainPage = async (req, res) => {
    return res.render("account/curtain.ejs");
}

const login = async (req, res) => {
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
    let { username, pwd } = req.body;

    if (!username || !pwd  ) {//!isNumber(username)
        return res.status(200).json({
            message: 'phone number or password invaild'
        });
    }
console.log(md5(pwd));
    try {
        const [rows] = await connection.query('SELECT * FROM users WHERE phone = ? AND password = ? ', [username, md5(pwd)]);
        if (rows.length == 1) {
            if (rows[0].status == 1) {
                const { password, money, ip, veri, ip_address, status, time, ...others } = rows[0];
                const accessToken = jwt.sign({
                    user: { ...others },
                    timeNow: timeNow
                }, process.env.JWT_ACCESS_TOKEN, { expiresIn: "1d" });
                const sql_login = `INSERT INTO login SET phone = ?`;
                await connection.execute(sql_login, [rows[0].phone]);
                await connection.execute('UPDATE `users` SET `token` = ?,`login_at`=CURRENT_TIMESTAMP WHERE `phone` = ? ', [md5(accessToken), username]);
                if (rows[0].bonus_gain == 0) {
                    let bonusstep = [0, 5, 10, 15, 20, 20, 20, 20];
                    let currentday = rows[0].next_bonus_gain;
                    // let money = bonusstep[((currentday - 1) % 7 + 7) % 7 + 1];
                    let money = 0;
                    const sql = `INSERT INTO transaction SET
                purpose = ?,
                phone = ?,
                money = ?,
                type = ?,
                status = ?,
                level = ?,
                today = ?,
                time = ?`;
                    await connection.execute(sql, ['Daily Login Bonus', rows[0].phone, money, 'credit', 1, 1, checkTime, checkTime]);
                    // console.log('Amount: ' + amount + '| ' + mm[i] + '% | ' + ' || ' + refferal + ' || ' + mainUser[0][0].phone + ' || ₹' + money);
                    await connection.query('UPDATE users SET money = money + ?,bonus_gain = ?, total_money = total_money + ? WHERE phone = ? ', [money, money, money, rows[0].phone]);
                }
                return res.status(200).json({
                    message: 'Login Sucess',
                    status: true,
                    token: accessToken,
                    value: md5(accessToken)
                });
            } else {
                return res.status(200).json({
                    message: 'Account has been locked',
                    status: false
                });
            }
        } else {
            return res.status(200).json({
                message: 'Incorrect Username or Password',
                status: false
            });
        }
    } catch (error) {
        if (error) console.log(error);
    }

}

// const register = async (req, res) => {
//     let now = new Date().getTime();
//     let { username, npwd, cpwd, invitecode, otp } = req.body;
//     let id_user = randomNumber(10000, 99999);
//     let otp2 = randomNumber(100000, 999999);
//     let name_user = "Member" + randomNumber(10000, 99999);
//     let code = randomString(5) + randomNumber(10000, 99999);
//     let ip = ipAddress(req);
//     let time = timeCreate();

//     if (!username || !npwd || !cpwd || !invitecode) {
//         return res.status(200).json({
//             message: 'ERROR!!!',
//             status: false
//         });
//     }

//     if (username.length < 9 || username.length > 10 || !isNumber(username)) {
//         return res.status(200).json({
//             message: 'phone error',
//             status: false
//         });
//     }

//     try {
//         const [check_u] = await connection.query('SELECT * FROM users WHERE phone = ?', [username]);
//         const [check_i] = await connection.query('SELECT * FROM users WHERE code = ? ', [invitecode]);
//         const [check_ip] = await connection.query('SELECT * FROM users WHERE ip_address = ? ', [ip]);
//         var date = new Date();

//         // Get the individual components of the date
//         var year = date.getFullYear();
//         var month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are zero-based
//         var day = ('0' + date.getDate()).slice(-2);

//         // Create the formatted date string
//         var formattedDate = year + '-' + month + '-' + day;
//         if (check_u.length == 1 && check_u[0].veri == 1) {
//             return res.status(200).json({
//                 message: 'Registered phone number',
//                 status: false
//             });
//         } else {
//             if (npwd == cpwd) {
//                 if (check_i.length == 1) {
//                     if (check_ip.length <= 3) {
//                         let ctv = '';
//                         if (check_i[0].level == 2) {
//                             ctv = check_i[0].phone;
//                         } else {
//                             ctv = check_i[0].ctv;
//                         }
//                         const sql = "INSERT INTO users SET id_user = ?,phone = ?,token=?,name_user = ?,password = ?,money = ?,code = ?,invite = ?,ctv = ?,veri = ?,otp = ?,ip_address = ?,status = ?,time = ?,create_at = ?";

//                         await connection.execute(sql, [id_user, username, username, name_user, md5(cpwd), 0, code, invitecode, ctv, 1, otp2, ip, 1, time, formattedDate]);
//                         await connection.execute('INSERT INTO point_list SET phone = ?', [username]);
//                         return res.status(200).json({
//                             message: 'Register Sucess',
//                             status: true
//                         });
//                     } else {
//                         return res.status(200).json({
//                             message: 'Registered IP address',
//                             status: false
//                         });
//                     }
//                 } else {
//                     return res.status(200).json({
//                         message: 'Referrer code does not exist',
//                         status: false
//                     });
//                 }
//             }
//             else {
//                 return res.status(200).json({
//                     message: 'New password and Confirm password do not match!',
//                     status: false
//                 });
//             }
//         }
//     } catch (error) {
//         return res.status(200).json({
//             message: 'error',
//             data: error,
//             status: false
//         });
//         if (error) console.log(error);
//     }

// }

const verifyCodeforregister = async (req, res) => {
    let phone = req.body.phone;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);
    request(`https://www.fast2sms.com/dev/bulkV2?authorization=6pVxWWakpzAchNXPAJSxiXZGjOBuuzvSWyyrPPBuq58bzX8bzigOUa8ZN2SX&route=otp&variables_values=${otp}&flash=0&numbers=${phone}`, async (error, response, body) => {
        let data = JSON.parse(response.body);
        if (data.return) {
            await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
            return res.status(200).json({
                message: 'OTP Send Successfully',
                status: true,
                timeStamp: timeNow,
                timeEnd: timeEnd,
            });
        }
    });
}
const register = async (req, res) => {
    let now = new Date().getTime();
    let { username, pwd, invitecode, countryCode } = req.body;
    let id_user = randomNumber(10000, 99999);
    let otp2 = randomNumber(100000, 999999);
    let name_user = "Member" + randomNumber(10000, 99999);
    let code = randomString(5) + randomNumber(10000, 99999);
    let ip = ipAddress(req);
    let time = timeCreate();

    if (!username || !pwd || !invitecode || !countryCode) {
        let missingField;
        if (!username) {
            missingField = 'username';
        } else if (!pwd) {
            missingField = 'password';
        } else if (!invitecode) {
            missingField = 'invite code';
        } else {
            missingField = 'country code';
        }
    
        return res.status(200).json({
            message: `Missing ${missingField}`,
            status: false
        });
    }
    
    if (username.length < 9 || username.length > 12 || !isNumber(username)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    try {
        const [check_u] = await connection.query('SELECT * FROM users WHERE phone = ?', [username]);
        const [check_i] = await connection.query('SELECT * FROM users WHERE code = ? ', [invitecode]);
        const [check_ip] = await connection.query('SELECT * FROM users WHERE ip_address = ? ', [ip]);

        if (check_u.length == 1 && check_u[0].veri == 1) {
            return res.status(200).json({
                message: 'Registered phone number',
                status: false
            });
        } else {
            if (check_i.length == 1) {
                if (check_ip.length <= 3) {
                    let ctv = '';
                    if (check_i[0].level == 2) {
                        ctv = check_i[0].phone;
                    } else {
                        ctv = check_i[0].ctv;
                    }
                    const sql = "INSERT INTO users SET countryCode=?,id_user = ?,phone = ?,name_user = ?,password = ?, plain_password = ?, money = ?,code = ?,invite = ?,ctv = ?,veri = ?,otp = ?,ip_address = ?,status = ?,time = ?";
                    await connection.execute(sql, [countryCode,id_user, username, name_user, md5(pwd), pwd, 0, code, invitecode, ctv, 1, otp2, ip, 1, time]);
                    await connection.execute('INSERT INTO point_list SET phone = ?', [username]);

                    let [check_code] = await connection.query('SELECT * FROM users WHERE invite = ? ', [invitecode]);

                    if(check_i.name_user !=='Admin'){
                        let levels = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44];

                        for (let i = 0; i < levels.length; i++) {
                            if (check_code.length >= levels[i]) {
                                await connection.execute('UPDATE users SET user_level = ? WHERE code = ?', [i + 1, invitecode]);
                            } else {
                                break;
                            }
                        }
                    }


                    let sql4 = 'INSERT INTO turn_over SET phone = ?, code = ?, invite = ?';
                    await connection.query(sql4, [username, code, invitecode]);

                    return res.status(200).json({
                        message: "Registered successfully",
                        status: true
                    });
                } else {
                    return res.status(200).json({
                        message: 'Registered IP address',
                        status: false
                    });
                }
            } else {
                return res.status(200).json({
                    message: 'Referrer code does not exist',
                    status: false
                });
            }
        }
    } catch (error) {
        if (error) console.log(error);
    }

}

const verifyCode = async (req, res) => {
    let phone = req.body.phone;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);

    if (phone.length < 9 || phone.length > 10 || !isNumber(phone)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ?', [phone]);
    if (rows.length == 0) {
        await request(`https://www.fast2sms.com/dev/bulkV2?authorization=6pVxWWakpzAchNXPAJSxiXZGjOBuuzvSWyyrPPBuq58bzX8bzigOUa8ZN2SX&variables_values=${otp}&route=otp&numbers=${phone}`, async (error, response, body) => {
            let data = JSON.parse(body);
            if (data.code == '00000') {
                await connection.execute("INSERT INTO users SET phone = ?, otp = ?, veri = 0, time_otp = ? ", [phone, otp, timeEnd]);
                return res.status(200).json({
                    message: 'Submitted successfully',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            }
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now <= 0) {
            request(`https://www.fast2sms.com/dev/bulkV2?authorization=6pVxWWakpzAchNXPAJSxiXZGjOBuuzvSWyyrPPBuq58bzX8bzigOUa8ZN2SX&variables_values=${otp}&route=otp&numbers=${phone}`, async (error, response, body) => {
                let data = JSON.parse(body);
                if (data.code == '00000') {
                    await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
                    return res.status(200).json({
                        message: 'Submitted successfully',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
                }
            });
        } else {
            return res.status(200).json({
                message: 'Send SMS regularly',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const verifyCodePass = async (req, res) => {
    let phone = req.body.phone;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);

    if (phone.length < 9 || phone.length > 10 || !isNumber(phone)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ? AND veri = 1', [phone]);
    if (rows.length == 0) {
        return res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now <= 0) {
            request(`https://www.fast2sms.com/dev/bulkV2?authorization=6pVxWWakpzAchNXPAJSxiXZGjOBuuzvSWyyrPPBuq58bzX8bzigOUa8ZN2SX&variables_values=${otp}&route=otp&numbers=${phone}`, async (error, response, body) => {
                let data = JSON.parse(body);
               // if (data.code == '00000') { 
                    await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
                    return res.status(200).json({
                        message: 'Submitted successfully',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
                //}
            });
        } else {
            return res.status(200).json({
                message: 'Send SMS regularly',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const forGotPassword = async (req, res) => {
    let username = req.body.username;
    let otp = req.body.otp;
    let pwd = req.body.pwd;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp2 = randomNumber(100000, 999999);

    if (username.length < 9 || username.length > 10 || !isNumber(username)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ? AND veri = 1', [username]);
    if (rows.length == 0) {
        return res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now > 0) {
            if (user.otp == otp) {
                await connection.execute("UPDATE users SET password = ?, otp = ?, time_otp = ? WHERE phone = ? ", [md5(pwd), otp2, timeEnd, username]);
                return res.status(200).json({
                    message: 'Change password successfully',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            } else {
                return res.status(200).json({
                    message: 'OTP code is incorrect',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        } else {
            return res.status(200).json({
                message: 'OTP code has expired',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const keFuMenu = async(req, res) => {
    let auth = req.cookies.auth;

    const [users] = await connection.query('SELECT `level`, `ctv` FROM users WHERE token = ?', [auth]);

    let telegram = '';
    if (users.length == 0) {
        let [settings] = await connection.query('SELECT `telegram`, `cskh` FROM admin');
        telegram = settings[0].telegram;
    } else {
        if (users[0].level != 0) {
            var [settings] = await connection.query('SELECT * FROM admin');
        } else {
            var [check] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ?', [users[0].ctv]);
            if (check.length == 0) {
                var [settings] = await connection.query('SELECT * FROM admin');
            } else {
                var [settings] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ?', [users[0].ctv]);
            }
        }
        telegram = settings[0].telegram;
    }
    
    return res.render("keFuMenu.ejs", {telegram}); 
}


module.exports = {
    login,
    register,
    loginPage,
    registerPage,
    forgotPage,
    curtainPage,
    verifyCode,
    verifyCodePass,
    forGotPassword,
    keFuMenu,
    verifyCodeforregister
}