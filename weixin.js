// 微信相关函数 whm
const common = require('./common.js')
const qiniuUploader = require("./qiniuUploader.js")
const Config = require('./config.js')

// 初始化七牛相关参数
function initQiniu() {
    var options = {
        region: 'ECN', // 华东区
        uptokenURL: Config.Web_Url + 'api/Mini/getToken',
        domain: 'images2',
        // uploadURL: 'http://images2.img.xilukeji.com',
        uploadURL: Config.Img_Url,
        shouldUseQiniuFileName: false,
    }
    qiniuUploader.init(options)
}

module.exports = {
    chooseImg: chooseImg, //微信上传图片
    getToken: getToken, //微信上传图片
    previewImg: previewImg, //微信预览图片
    scanCode: scanCode, //扫码
    wxpay: wxpay, //微信支付
}
//上传图片
var tempFilePaths
var callback

function chooseImg(num, that, uploadtoken, cb) {
    num = num || 9
    callback = cb || ''
    var date = new Date()
    var year = date.getFullYear()
    var month = date.getMonth() + 1
    month = (month < 10 ? "0" + month : month)
    var strDate = date.getDate()
    var mydate = (year.toString() + month.toString() + strDate.toString())
    wx.chooseImage({
        count: num, // 默认9
        sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
        sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
        success: function(res) {
            // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
            var tempFilePaths = res.tempFilePaths
            // console.log(tempFilePaths)
            for (var i = 0; i < tempFilePaths.length; i++) {
                var filePath = tempFilePaths[i]
				var upload_name = Config.Qiniu_Name +'/' + mydate + '/' + filePath.substr(-40, 40)
                // uploadImg(tempFilePaths);
                // 交给七牛上传
                qiniuUploader.upload(filePath, (res) => {
                        // var picArr=that.picArr||[];
                        // picArr.push(Config.Img_Url+res.key);
                        // that.setData({
                        //   picArr: picArr
                        // });
                        //callback方法
                        if (typeof callback == "function") {
                            callback(Config.Img_Url + '/' + res.key)
                        }
                    }, (error) => {
                        console.error('error: ' + JSON.stringify(error))
                    }, {
                        region: 'ECN', // 华东区
                        uptoken: uploadtoken,
                        domain: 'images',
                        shouldUseQiniuFileName: false,
                        key: upload_name,
                    }, // 可以使用上述参数，或者使用 null 作为参数占位符
                    (progress) => {
                        // console.log('上传进度', progress.progress)
                        // console.log('已经上传的数据长度', progress.totalBytesSent)
                        // console.log('预期需要上传的数据总长度', progress.totalBytesExpectedToSend)
                    }, cancelTask => that.setData({
                        cancelTask
                    }),
                )
            }
        },
    })
}

//获取七牛token
function getToken(num, that, cb) {
    wx.request({
        url: Config.Web_Url + 'api/Mini/getToken',
        data: {},
        header: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        dataType: "json",
        fail: function(e) {
            console.log('上传失败')
        },
        success: function(ret) {
            // console.log(ret)
            chooseImg(num, that, ret.data.upToken, cb)
        },
    })
}

function uploadImg(tempFilePaths) {
    var tempFile = tempFilePaths.shift() //把数组的第一个元素从其中删除，并返回第一个元素的值
    var url = Config.Web_Url + "index.php?s=Home/Upload/upload"
    wx.showLoading({
        title: '上传中...',
    })
    wx.uploadFile({
        url: url,
        filePath: tempFile,
        name: 'pic',
        header: {
            "Content-Type": "multipart/form-data"
        },
        success: function(res) {
            var ret = JSON.parse(res.data)
            if (ret.status) {
                var len = tempFilePaths.length
                typeof callback == 'function' && callback(ret, len) //图片上传成功后置操作
                if (len > 0) {
                    uploadImg(tempFilePaths)
                } else {
                    wx.hideLoading()
                }
            } else {
                common.Toast("上传失败，请重新上传")
                console.log(ret.info)
            }
        },
    })
}

//预览图片
function previewImg(current, urls) {
    wx.previewImage({
        current: current, // 当前显示图片的http链接
        urls: urls, // 需要预览的图片http链接列表
    })
}

//微信扫码
function scanCode(cb, onlyFromCamera = false, scanType) {
    var sType = ['qrCode', 'barCode', 'datamatrix', 'pdf417']
    if (typeof scanType == "undefined") {
        scanType = sType
    }
    wx.scanCode({
        onlyFromCamera: onlyFromCamera,
        scanType: scanType,
        success: (res) => {
            if (res.errMsg == "scanCode:ok") {
                typeof cb == "function" && cb(res)
            } else {
                common.Toast(res.errMsg)
            }
        },
    })
}

//微信支付
function wxpay(data, cb1, cb2) {
    wx.requestPayment({
        timeStamp: data.timeStamp,
        nonceStr: data.nonceStr,
        package: data.package,
        signType: data.signType,
        paySign: data.paySign,
        success: function(res) {
            if (res.errMsg == "requestPayment:ok") {
                typeof cb1 == "function" && cb1(res)
            }
        },
        fail: function(res) {
            if (res.errMsg == "requestPayment:fail cancel") {
                typeof cb2 == "function" && cb2(res)
            } else {
                common.Toast("唤起微信支付失败！")
            }
        },
        complete: function(res) {
            if (res.errMsg == "requestPayment:cancel") {
                typeof cb2 == "function" && cb2(res)
            }
        },
    })
}