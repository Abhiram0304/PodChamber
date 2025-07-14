const preRenderVideoLinkTemplate = (link: string) => {
	return `<!DOCTYPE html>
	<html>
	
	<head>
		<meta charset="UTF-8">
		<title>Pre-Rendered Video Link</title>
		<style>
			body {
				background-color: #ffffff;
				font-family: Arial, sans-serif;
				font-size: 16px;
				line-height: 1.4;
				color: #333333;
				margin: 0;
				padding: 0;
			}
	
			.container {
				max-width: 600px;
				margin: 0 auto;
				padding: 20px;
				text-align: center;
			}
	
			.logo {
				max-width: 200px;
				margin-bottom: 20px;
			}
	
			.message {
				font-size: 18px;
				font-weight: bold;
				margin-bottom: 20px;
			}
	
			.body {
				font-size: 16px;
				margin-bottom: 20px;
			}
	
			.cta {
				display: inline-block;
				padding: 10px 20px;
				background-color: #FFD60A;
				color: #000000;
				text-decoration: none;
				border-radius: 5px;
				font-size: 16px;
				font-weight: bold;
				margin-top: 20px;
			}
	
			.support {
				font-size: 14px;
				color: #999999;
				margin-top: 20px;
			}
		</style>
	
	</head>
	
	<body>
		<div class="container">
			<a href=""><img class="logo"
					src="https://podchamber-test1.s3.ap-south-1.amazonaws.com/web-assets/icon.png" alt="PodChamber Logo"></a>
			<div class="message">Your Pre-Rendered Video</div>
			<div class="body">
				<p>Dear User,</p>
				<p>Thank you for using <strong>PodChamber</strong>. Below is the link to download your pre-rendered video:</p>
				<p><a class="cta" href="${link}" target="_blank">Download Video</a></p>
				<p>This video will be automatically deleted after <strong>24 hours</strong>. Kindly download it before that time.</p>
			</div>
		</div>
	</body>
	
	</html>`;
};

export default preRenderVideoLinkTemplate;
