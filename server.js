/*
	设置 
	beginNum 开始页
	endMum 结束页 
*/

//一些依赖库
let http = require('http'),
	url = require('url'),
	superagent = require('superagent'),
	cheerio = require('cheerio'),
	async = require('async'),
	eventproxy = require('eventproxy');
//自定义模块
	Server = require('./service/server');



//全局变量
let ep = eventproxy(),
	deleteRepeat = [], //去重哈希数组
	articleUrls = [], //存放爬取文章地址
	catchData = [], //存放爬取的数据
	pageUrls = [], //存放搜集文章列表地址
	beginNum = 1, //开始页 
	endNum = 5, //结束页
	pageNum = endNum - beginNum + 1, //要爬取文章的页数
	startDate = new Date(), //开始时间
	endDate = false, //结束时间
	port = 3000; //监听端口号

	//判断爬取页数
	if(pageNum < 0){
		return
	}

	for(let i = beginNum;i <= pageNum;i++){
		pageUrls.push('http://www.cnblogs.com/?CategoryId=808&CategoryType=%22SiteHome%22&ItemListActionName=%22PostList%22&PageIndex='+ i +'&ParentCategoryId=0');
	}

//判断作者是否重复
const isRepeat = (authorName) => {
	if(deleteRepeat[authorName] == undefined){
		deleteRepeat[authorName] = 1;
		return 0;
	}else if(deleteRepeat[authorName] == 1){
		return 1;
	}
}

//主程序
const start = () => {
	const onRequest = (req,res) => {
		res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
		res.write('<hr><h2>抓取文章列表页数:' + pageNum + '</h2><hr>')

		//轮询所有文章列表页
		pageUrls.forEach(pageUrl => {
			res.write('<p>fetch <span style="color:red">' + pageUrl + '</span> successful</p>')

			superagent
			.get(pageUrl)
			.end((err,body) => {
			  // pres.text 里面存储着请求返回的 html 内容，将它传给 cheerio.load 之后
              // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
              // 剩下就都是利用$ 使用 jquery 的语法了
              let $ = cheerio.load(body.text);
              //当前列表页所有文章url
              let curPageUrls = $('.titlelnk');

              for(let i = 0;i < curPageUrls.length;i++){
              	let articleUrl = curPageUrls.eq(i).attr('href');
              	articleUrls.push(articleUrl);

              	//相当于一个计数器
              	ep.emit('BlogArticleHtml',articleUrl);
              }
			});
		});

		ep.after('BlogArticleHtml',pageUrls.length * 20, articleUrls => {
			res.write('<hr><h2>文章数量:' + articleUrls.length + '</h2><hr>');

			//文章链接
			articleUrls.forEach(articleUrl => {
				res.write('<p>fetch <span style="color:red">' + articleUrl + '</span> successful</p>')
			})

			// 当所有 'BlogArticleHtml' 事件完成后的回调触发下面事件
			//控制并发数
			let curCount = 0;

			let reptileMove = (url,callback) => {

				//延迟毫秒数
				let delay = parseInt((Math.random() * 3000000) % 1000,10);
				curCount++;

				console.log('现在的并发数是' + curCount + '，正在抓取的是' + url + '，耗时' + delay + '毫秒'); 

				superagent.get(url)
				.end((err,body) => {
					let $ = cheerio.load(body.text);
					//搜集数据
					//收集用户个人信息，昵称、园龄、粉丝、关注
					//拼接url
					let curBlogApp = url.split('/p')[0].split('/')[3],
						requestId = url.split('/p')[1].split('.')[0];

						res.write('<p>curBlogApp is <span style="color:red">' + curBlogApp + '</span>,' + 'requestId is <span style="color:red">' + requestId + '</span><br>');
						res.write('the article title is <span style="color:red">' + $('title').text() + '</span></p>');

					if(!isRepeat(curBlogApp)){
						let appUrl = 'http://www.cnblogs.com/mvc/blog/news.aspx?blogApp='+curBlogApp; 
						//具体搜集函数
						Server.personInfo(appUrl,catchData);
					}
				})

				//搜索延迟
				setTimeout(() => {
					curCount--;
					callback(null,url+'call back content');
				},delay);
			}




		//使用async控制异步抓取
		//mapLimit(arr,limit,iterator,[callback])
		//异步回调
		res.write('<hr><h2>文章详情</h2><hr>')
		async.mapLimit(articleUrls,5,(url,callback) => {
			reptileMove(url,callback);
		},(err,result) => {
			//结束
			endDate = new Date();

			let len = catchData.length,
				aveAge = 0,
				aveFans = 0,
				aveFocus = 0;

			//数据爬取完成之后的回调
			res.write('<hr><h2>个人信息</h2><hr>')
			catchData.forEach(eachData => {
				res.write(JSON.stringify(eachData) + '<br>');

				let eachDataFans = eachData.fans || 0,
					eachDataFocus = eachData.focus || 0;
					
					//全局变量
					aveAge += parseInt(eachData.age);
			  		aveFans += parseInt(eachDataFans);
			  		aveFocus += parseInt(eachDataFocus);
			})

			  //统计结果
			  res.write('<hr><h2>统计结果</h2><hr>');
			  res.write('1、爬虫开始时间：'+ startDate.toLocaleDateString() + " " + startDate.toLocaleTimeString() +'<br/>');
			  res.write('2、爬虫结束时间：'+ endDate.toLocaleDateString() + " " + endDate.toLocaleTimeString() + '<br/>');
			  res.write('3、耗时：'+ (endDate - startDate) +'ms' +' --> '+ (Math.round((endDate - startDate)/1000/60*100)/100) +'min <br/>');
			  res.write('4、爬虫遍历的文章数目：'+ pageNum*20 +'<br/>');
			  res.write('5、作者人数：'+ len +'<br/>');
			  res.write('6、作者入园平均天数：'+ Math.round(aveAge/len*100)/100 +'<br/>');
			  res.write('7、作者人均粉丝数：'+ Math.round(aveFans/len*100)/100 +'<br/>');
			  res.write('8、作者人均关注数：'+ Math.round(aveFocus/len*100)/100 +'<br/>');
			  
			})
		})
	}

	http.createServer(onRequest).listen(port,error => {
		if(error)
			console.error(error)
    	else 
    		console.info("==> 🌎  Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port)
	})
}

module.exports = start;