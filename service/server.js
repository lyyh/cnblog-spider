//依赖
let superagent = require('superagent'),
	cheerio = require('cheerio');

//爬取昵称 入园年龄 粉丝数 关注数
exports.personInfo = (appUrl,catchData) => {
	let infoObj = {};

	superagent.get(appUrl)
	.end((err,body) => {
		if(err){
			console.log(err)
			return
		}

		let $ = cheerio.load(body.text),
			info = $('#profile_block a'),
			len = info.length,
			age = '';

	  // 小概率异常抛错	
  	  try{
  	  	age = "20"+(info.eq(1).attr('title').split('20')[1]);
  	  }
  	  catch(err){
  	  	console.log(err);
  	  	age = "2012-11-06";
  	  }	

  	  //作者姓名
  	  infoObj.name = info.eq(0).text();
  	  //入园年龄
  	  infoObj.age = parseInt((new Date - new Date(age))/1000/60/60/24, 10);
  	   
  	  if(len == 4){
	 	    infoObj.fans = info.eq(2).text();
	    	infoObj.focus = info.eq(3).text();	
	   }else if(len == 5){// 博客园推荐博客
	 	    infoObj.fans = info.eq(3).text();
	    	infoObj.focus = info.eq(4).text();	
	   }

	   catchData.push(infoObj);
	})
}
