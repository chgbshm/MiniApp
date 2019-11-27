// LAM 公共函数
const Config = require('./config.js')
/**
 * 获取定位并解析地址(腾讯地图)
 * @param success function 回调函数
 */
function GetLocation(success) {
    let map_key = Config.Map_Key
    wx.getLocation({
        type: 'wgs84',
        success(res) {
            // console.log(res)
            if (!map_key) {
                console.log('未设置地图key参数')
                return false
            } else {
                _get('https://apis.map.qq.com/ws/geocoder/v1/', {
                    location: res.latitude + ',' + res.longitude,
                    key: map_key,
                }, function(e) {
                    // console.log(e)
                    var address = {
                        lat: res.latitude,
                        lng: res.longitude,
                        city: e.result.address_component.city,
                        recommend: e.result.formatted_addresses.recommend,
                        address: e.result.address
                    }
                    success && success(address)
                })
            }
        },
    })
}

/**
 * 获取列表
 * @param that object 获取列表页的页面对象
 * @param url string Get请求地址
 * @param data object 请求参数
 * @param success function 回调方法
 */
function GetList(that, url, data, success) {
    data = data || {}
    data.page = that.data.page // 获取当前页码
    data.limit = that.data.limit // 获取每页数量
    if (!that.data.nothing && that.data.on_off) {
        // 判断是否有数据，且开关是否打开
        that.setData({
            on_off: false,
            none_show: false,
        })
        _get(url, data, function(res) {
            if (that.data.page == 1) {
                var list = []
            } else {
                var list = that.data.list
            }
            list = list.concat(res.list)
            var page = parseInt(that.data.page) + 1
            that.setData({
                list: list,
                page: page,
                total: res.total,
                nothing: res.nothing,
                none_show: true,
                on_off: true,
            })
            success && success(res)
        })
    }
}

/**
 * GET请求
 * @param url       string      请求地址
 * @param data      object      请求数据
 * @param success   function    请求成功后回调
 * @param fail      function    请求失败后回调
 * @param complete  function    请求结束后回调
 */
function _get(url, data, success, fail, complete) {
    wx.showNavigationBarLoading()
    // 构造请求参数
    data = data || {}
    // 判断缓存中openid
    if (wx.getStorageSync('openid')) {
        data.token = wx.getStorageSync('openid')
    }
    if (wx.getStorageSync('user_id')) {
        data.user_id = wx.getStorageSync('user_id')
    }
    // 构造get请求
    wx.request({
        url: VerifyURL(url),
        header: {
            'content-type': 'application/json',
        },
        data: data,
        success(res) {
            // console.log(res.data.code)
            if (res.data.code === 0) {
                Model(res.data.msg)
                return false
            } else if (res.data.code === 88) {
                // console.log(res.data.code)
                Toast(res.data.msg, '', '', function() {
                    wx.navigateBack()
                })
                return false
            } else {
                success && success(res.data)
            }
        },
        fail(res) {
            Model(res.msg, '', '', function() {
                fail && fail(res)
            })
        },
        complete(res) {
            wx.hideNavigationBarLoading()
            complete && complete(res)
        },
    })
}

/**
 * POST请求
 * @param url       string      请求地址
 * @param data      object      请求数据
 * @param success   function    请求成功后回调
 * @param fail      function    请求失败后回调
 * @param complete  function    请求结束后回调
 */
function _post(url, data, success, fail, complete) {
    wx.showNavigationBarLoading()
    // 构造请求参数
    data = data || {}
    // 判断缓存中openid
    if (wx.getStorageSync('openid')) {
        data.token = wx.getStorageSync('openid')
    }
    if (wx.getStorageSync('user_id')) {
        data.user_id = wx.getStorageSync('user_id')
    }
    wx.request({
        url: VerifyURL(url),
        header: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        data: data,
        success(res) {
            if (res.data.code === 0) {
                Model(res.data.msg, '', '', function() {
                    fail && fail(res)
                })
                return false
            } else if (res.data.code === 88) {
                // console.log(res.data.code)
                Toast(res.data.msg, '', '', function() {
                    wx.navigateBack()
                })
                return false
            } else {
                success && success(res.data)
            }
        },
        fail(res) {
            Model(res.msg, '', '', function() {
                fail && fail(res)
            })
        },
        complete(res) {
            wx.hideNavigationBarLoading()
            complete && complete(res)
        },
    })
}

/**
 * wx.showModal提示
 * @param msg       string      对话框提示信息
 * @param title     string      对话框标题
 * @param cancel    bool        是否开启取消功能
 * @param callback  function    点击确认后回调
 */
function Model(msg, title, cancel, callback) {
    title = title || '提示'
    wx.showModal({
        title: title.toString(),
        content: msg.toString(),
        showCancel: cancel || false,
        success: function(res) {
            if (res.confirm) {
                // 点击确认后执行操作
                typeof callback == "function" && callback();
            }
        },
    });
}

/**
 * wx.showToast提示
 * @param msg       string      提示框内容
 * @param icon      string      提示框图标
 * @param duration  int         提示框隐藏时间
 * @param callback  function    提示框成功后回调
 */
function Toast(msg, icon, duration, callback) {
    wx.showToast({
        title: msg.toString(),
        icon: icon || 'none',
        duration: duration || 1500,
        mask: true,
        success() {
            callback && (setTimeout(function() {
                callback()
            }, duration || 1500))
        },
    });
}

/**
 * 网址正则判断完整
 * @param url string  URL地址
 * @return {string}
 */
function VerifyURL(url) {
    var reg = /^((ht|f)tps?):\/\/[\w\-]+(\.[\w\-]+)+([\w\-.,@?^=%&:\/~+#]*[\w\-@?^=%&\/~+#])?$/;
    // 判断是否是完整http|https|ftp地址
    if (reg.test(url)) {
        // 直接请求当前地址
        return url
    } else {
        // 自定义方法短链接,拼接app.js中设置的请求链接
        return Config.Web_Url + url
    }
}

//验证手机
function checkmobile(mobile) {
    if (!mobile) {
        Toast('请输入手机号码');
        return false;
    }
    if (!checkTel(mobile)) {
        Toast('请输入正确的手机号码');
        return false;
    }
    return true;
}

//检测手机号正确性
function checkTel(tel) {
    return /^(0|86|17951)?1[0-9]{10}$/.test(tel);
}

/**
 * 判断字符串是否在数组中
 */
function in_array(stringToSearch, arrayToSearch) {
    for (var s = 0; s < arrayToSearch.length; s++) {
        var thisEntry = arrayToSearch[s].toString()
        if (thisEntry == stringToSearch) {
            return true
        }
    }
    return false
}
// 获取fromID
function saveFormId(formid) {
    console.log(formid)
    if (typeof formid == 'undefined' || !formid || formid == 'the formId is a mock one') {
        return false;
    }
    var openid = wx.getStorageSync('openid') || ''
    wx.request({
		url: VerifyURL('api/Mini/saveFormId'),
        data: {
            formid: formid,
            openid: openid
        },
        header: {
            'content-type': 'application/x-www-form-urlencoded',
            'openid': openid
        },
        method: 'post',
        success: function(res) {
            console.log('formId', res)
        },
        fail: function(res) {
            console.log('接口调用失败', res)
        },
        complete: function(res) {}
    })
}

// 模块化方法
module.exports = {
    GetLocation: GetLocation, // 获取定位并解析地址
    GetList: GetList, // 获取分页列表信息
    _get: _get, // 通用GET请求
    _post: _post, // 通用POST请求
    Model: Model, // 错误信息提示对话框
    Toast: Toast, // 纯文字弹窗信息
    VerifyURL: VerifyURL, // 判断请求地址，并为方法地址添加http
    checkmobile: checkmobile,
    in_array: in_array,
    saveFormId: saveFormId,
}