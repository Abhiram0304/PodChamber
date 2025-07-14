const preRenderVideoFailureTemplate = () => {
  return `<!DOCTYPE html>
  <html>
  
  <head>
    <meta charset="UTF-8">
    <title>Video Rendering Failed</title>
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
        color: #d9534f;
        margin-bottom: 20px;
      }

      .body {
        font-size: 16px;
        margin-bottom: 20px;
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
      <div class="message">Video Rendering Failed</div>
      <div class="body">
        <p>Dear User,</p>
        <p>We're sorry, but your pre-rendered video could not be processed due to a technical issue.</p>
        <p>Please try again later.</p>
      </div>
    </div>
  </body>
  
  </html>`;
};

export default preRenderVideoFailureTemplate;
