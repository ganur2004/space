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
from datetime import datetime

def home(request):
    result = get_imagery(request)
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
        size = request.session.get('size', {})
        band = request.session.get('band', 'reflectivecolor')
        print("size: ", size)
        print("bandband: ", band)
        current_date = datetime.now().strftime('%Y-%m-%d')
        bandList = {
            "reflectivecolor": 0,
            "thermalbrowse": 1,
            "qualitybrowse": 2,
            "cir": 3,
            "urban": 4,
            "vegetationanalysis": 5,
            "naturalcolor": 6,
            "nir": 7,
            "nbr": 8,
            "ndmi": 9,
            "ndsi": 10,
            "ndvi": 11,
            "savi": 12
        }

        startDate = stored_filters.get('startDate', '2024-01-01')
        endDate = stored_filters.get('endDate', current_date)
        minCloudCover = int(stored_filters.get('minCloudCover', 0))
        maxCloudCover = int(stored_filters.get('maxCloudCover', 100))
        includeUnknown = bool(stored_filters.get('includeUnknown', False))
        maxResults = int(stored_filters.get('maxResults', 1000))
        print("\nRunning Scripts...\n")
    
        global serviceUrl 
        serviceUrl = "https://m2m.cr.usgs.gov/api/api/json/stable/"
        
        payload = {'username' : 'Nurmat', 'password' : 'Gannur2004ka@'}
        
        apiKey = sendRequest(serviceUrl + "login", payload)
        
        print("API Key: " + apiKey + "\n")

        datasetName = "landsat_ot_c2_l1"
        #datasetName = "gls_all"
        
        spatialFilter =  {'filterType' : "mbr",
                        'lowerLeft' : {'latitude' : latitude - size/2, 'longitude' : longitude - size},
                        'upperRight' : { 'latitude' : latitude + size/2, 'longitude' : longitude + size}}
                        
        temporalFilter = {'start' : startDate, 'end' : endDate}
        
        payload = {'datasetName' : datasetName,
                                'spatialFilter' : spatialFilter,
                                'temporalFilter' : temporalFilter}                     
        
        print("Searching datasets...\n")
        datasets = sendRequest(serviceUrl + "dataset-search", payload, apiKey)
        
        print("Found ", len(datasets), " datasets\n")

        for dataset in datasets:
        
            if dataset['datasetAlias'] != datasetName:
                print("Found dataset " + dataset['collectionName'] + " but skipping it.\n")
                continue

            payloadDataset = {'datasetId': dataset['datasetId']}

            datasetId = sendRequest(serviceUrl + "dataset-browse", payloadDataset, apiKey)

            overlaySpec = datasetId[0]['overlaySpec']
            
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
            
            print("Searching scenes...\n\n")   
            
            scenes = sendRequest(serviceUrl + "scene-search", payload, apiKey)

            if scenes['recordsReturned'] > 0:
                imageUrls = []
                imageCoordinates = []
                entityId = []
                screenInfo = {}
                browse = {}
                for result in scenes['results']:
                    imageCoordinate = []
                    screenInfoDate = {}
                    imageUrl = None
                    publishDate = None
                    spatialCoverage = None
                    overlayPath = None
                    overlayPathBands = None
                    
                    if 'publishDate' in result and result['publishDate']:
                        #print("PublishDate: ", result['publishDate'])
                        publishDate = result['publishDate']
                        
                    if 'displayId' in result and result['displayId']:
                        extractDisplayId = extract_number(result['displayId'])
                        if extractDisplayId:
                            #print("Display: ", extractDisplayId)
                            displayId = result['displayId']
                           # print("Display id: ", displayId)
                            if 'cloudCover' in result and result['cloudCover']:
                                cloudCover = result['cloudCover'] 
                            else:
                                cloudCover = 0

                            if 'browse' in result and result['browse']:
                                browse[displayId] = result['browse']
                                # print("Photo url: ", result['browse'][0]['overlayPath'])
                                overlayPath = result['browse'][0]['overlayPath']

                            if 'browse' in result and result['browse']:
                                # print("Photo url: ", result['browse'][0]['browsePath'])
                                imageUrl = result['browse'][0]['browsePath']
                                # print(result['browse'], end="\n\n\n")
                            
                            if 'spatialBounds' in result and result['spatialBounds']:
                                #print("Coordinates: ", result['spatialCoverage']['coordinates'][0])
                                spatialBounds = result['spatialBounds']['coordinates'][0]

                            if 'spatialCoverage' in result and result['spatialCoverage']:
                                #print("Coordinates: ", result['spatialCoverage']['coordinates'][0])
                                spatialCoverage = result['spatialCoverage']['coordinates'][0]
                            # print("Cloud cover: ", cloudCover)
                                
                            # Собираем данные для screenInfoDate
                            screenInfoDate = {
                                'overlaySpec': overlaySpec, 
                                'overlayPath': overlayPath,
                                'imageUrl': imageUrl,
                                'spatialCoverage': spatialCoverage,
                                'publishDate': publishDate,
                                'cloudCover': cloudCover,
                                'displayImagesId': displayId,
                                'spatialBounds': spatialBounds,
                                'overlayPathBands': overlayPathBands
                            }
                            
                            # Обновляем данные в screenInfo для текущего extractDisplayId
                            if extractDisplayId in screenInfo:
                                screenInfo[extractDisplayId]['screenInfoDate'].append(screenInfoDate)
                            else:
                                screenInfo[extractDisplayId] = {
                                    'screenInfoDate': [screenInfoDate]
                                }
        request.session['screenInfo'] = screenInfo
        request.session['browse'] = browse

        return JsonResponse({'screenInfo': screenInfo})
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)

def extract_number(display_id):
    # Используем регулярное выражение для извлечения числа 153029
    import re
    match = re.search(r'\d{6}', display_id)
    if match:
        return match.group(0)
    return None


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
    
def get_size(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        size = data.get('size', {})
        request.session['size'] = size
        

        return JsonResponse({'success': True})
    

def get_band(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        band = data.get("band", 'reflectivecolor')
        request.session['band'] = band
        browse = request.session.get('browse', {})
        
        #print("browse: ", browse)
        screenInfo = request.session.get('screenInfo', {})
        #print("Screeninfo", screenInfo)
        band_list = {
            "reflectivecolor": 0,
            "thermalbrowse": 1,
            "qualitybrowse": 2,
            "cir": 3,
            "urban": 4,
            "vegetationanalysis": 5,
            "naturalcolor": 6,
            "nir": 7,
            "nbr": 8,
            "ndmi": 9,
            "ndsi": 10,
            "ndvi": 11,
            "savi": 12
        }

        #print(screenInfo)

        for display_id in screenInfo:
            screenInfoDisplay = screenInfo[display_id]
            for screen in screenInfoDisplay["screenInfoDate"]:
                print(screen)
                overlayPath = browse[screen['displayImagesId']][band_list[band]]['overlayPath']
                screen['overlayPath'] = overlayPath

        
        request.session['screenInfo'] = screenInfo
        
        return JsonResponse({'screenInfo': screenInfo})
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    

