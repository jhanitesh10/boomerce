fetch("https://2.rome.api.flipkart.com/api/3/reviews/product/rate", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    "sec-ch-ua": "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "x-user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop"
  },
  "referrer": "https://www.flipkart.com/",
  "body": "{\"productId\":\"SINHHK9H4FPHQHTG\",\"rating\":5,\"source\":\"od_sum\"}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});