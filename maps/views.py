# views.py
import requests
import json
import sys
import time
import argparse
import datetime
import threading
import re
import os
from django.shortcuts import render
from django.http import JsonResponse

def home(request):
    result = get_imagery(request)
    print("Result: ", result)
    return render(request, 'maps/home.html', {
        "imageUrls": result
    } )

def get_imagery(request):
    imageUrls = []
    if request.method == 'POST':
        data = json.loads(request.body)
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
        stored_filters = request.session.get('filters', {})

        startDate = stored_filters.get('startDate', '2024-01-01')
        endDate = stored_filters.get('endDate', '2024-12-31')
        minCloudCover = int(stored_filters.get('minCloudCover', 0))
        maxCloudCover = int(stored_filters.get('maxCloudCover', 100))
        includeUnknown = bool(stored_filters.get('includeUnknown', False))
        maxResults = int(stored_filters.get('maxResults', 1000))
        print("Latitude: ", latitude)
        print("Longitude: ", longitude)
        print("Start date: ", startDate)
        print("end date: ", endDate )
        print("minCloud: ", minCloudCover)
        print("maxCloud: ", maxCloudCover)
        print("includeUnk: ", includeUnknown)
        print("maxResults: ", maxResults)
        # response = requests.get(api_url)
        print("\nRunning Scripts...\n")
    
        global serviceUrl 
        serviceUrl = "https://m2m.cr.usgs.gov/api/api/json/stable/"
        
        # login
        # payload = {'username' : username, 'password' : password}
        payload = {'username' : 'Nurmat', 'password' : 'Gannur2004ka@'}
        
        apiKey = sendRequest(serviceUrl + "login", payload)
        
        print("API Key: " + apiKey + "\n")

        datasetName = "landsat_ot_c2_l1"
        #datasetName = "gls_all"
        
        spatialFilter =  {'filterType' : "mbr",
                        'lowerLeft' : {'latitude' : latitude - 1, 'longitude' : longitude - 1},
                        'upperRight' : { 'latitude' : latitude + 1, 'longitude' : longitude + 1}}
                        
        temporalFilter = {'start' : startDate, 'end' : endDate}
        
        payload = {'datasetName' : datasetName,
                                'spatialFilter' : spatialFilter,
                                'temporalFilter' : temporalFilter}                     
        
        print("Searching datasets...\n")
        datasets = sendRequest(serviceUrl + "dataset-search", payload, apiKey)
        
        print("Found ", len(datasets), " datasets\n")

        for dataset in datasets:
        
        # Because I've ran this before I know that I want GLS_ALL, I don't want to download anything I don't
        # want so we will skip any other datasets that might be found, logging it incase I want to look into
        # downloading that data in the future.
            if dataset['datasetAlias'] != datasetName:
                print("Found dataset " + dataset['collectionName'] + " but skipping it.\n")
                continue
                
            # I don't want to limit my results, but using the dataset-filters request, you can
            # find additional filters
            
            acquisitionFilter = {"end": endDate,
                                "start": startDate }   

            cloudCoverFilter = {"max": maxCloudCover, "min": minCloudCover, "includeUnknown": includeUnknown}     
                
            payload = {'datasetName' : dataset['datasetAlias'], 
                                    'maxResults' : maxResults,
                                    'startingNumber' : 1, 
                                    'sceneFilter' : {
                                                    'spatialFilter' : spatialFilter,
                                                    'acquisitionFilter' : acquisitionFilter,
                                                    'cloudCoverFilter' : cloudCoverFilter}}
            
            # Now I need to run a scene search to find data to download
            print("Searching scenes...\n\n")   
            
            scenes = sendRequest(serviceUrl + "scene-search", payload, apiKey)

            if scenes['recordsReturned'] > 0:
                imageUrls = []
                for result in scenes['results']:
                    # Проверяем, что список 'browse' не пустой
                    if 'browse' in result and result['browse']:
                        print("Photo url: ", result['browse'][0]['browsePath'])
                        imageUrls.append(result['browse'][0]['browsePath'])

        return JsonResponse({'imageUrls': imageUrls})
        
            # Did we find anything?
            # if scenes['recordsReturned'] > 0:
            #     # Aggregate a list of scene ids
            #     sceneIds = []
            #     for result in scenes['results']:
            #         print("Photo url: ", result['browse'][0]['browsePath'])
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)



def sendRequest(url, data, apiKey = None):  
    pos = url.rfind('/') + 1
    endpoint = url[pos:]
    json_data = json.dumps(data)
    
    if apiKey == None:
        response = requests.post(url, json_data)
    else:
        headers = {'X-Auth-Token': apiKey}              
        response = requests.post(url, json_data, headers = headers)    
    
    try:
      httpStatusCode = response.status_code 
      if response == None:
          print("No output from service")
          sys.exit()
      output = json.loads(response.text)	
      if output['errorCode'] != None:
          print("Failed Request ID", output['requestId'])
          print(output['errorCode'], "-", output['errorMessage'])
          sys.exit()
      if  httpStatusCode == 404:
          print("404 Not Found")
          sys.exit()
      elif httpStatusCode == 401: 
          print("401 Unauthorized")
          sys.exit()
      elif httpStatusCode == 400:
          print("Error Code", httpStatusCode)
          sys.exit()
    except Exception as e: 
          response.close()
          pos=serviceUrl.find('api')
          print(f"Failed to parse request {endpoint} response. Re-check the input {json_data}. The input examples can be found at {url[:pos]}api/docs/reference/#{endpoint}\n")
          sys.exit()
    response.close()    
    print(f"Finished request {endpoint} with request ID {output['requestId']}\n")
    
    return output['data']


def second(request):
    return render(request, 'maps/second.html', {
        "text": "Nurmat"
    })

def get_filters(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        filters = data.get('filters', {})
        request.session['filters'] = filters

        return JsonResponse({'success': True})