#define HTML_PAGE "codes.html"
#define START_BLOCK "<strong>"
#define END_BLOCK "</strong>"

int extract()
{

    FILE *html;

    int found = 0;
    char *line = NULL, *endTag, *startTag;
    size_t len = 0;
    ssize_t read;

    char searchFor[80];

    html = fopen(HTML_PAGE, "r");

    if (html)
    {
        while((read = getline(&line, &len, html)) != -1)
        {
            if (found) // found line with codes we are interested in
            {
                char   *ptr = line;
                size_t nlen = strlen (END_BLOCK);

                while (ptr != NULL) 
                {
                    sprintf(searchFor, START_BLOCK);
                    startTag = (char *)strstr(ptr, searchFor);
                    if(!startTag)
                    {
                        nlen = strlen (START_BLOCK);
                        ptr += nlen;
                        continue;
                    }

                    if (strncmp(startTag + strlen(searchFor), "CO1", 3) == 0 || strncmp(startTag + strlen(searchFor), "CO2", 3) == 0)
                        got_code(startTag + strlen(searchFor), code);
                    else {
                        nlen = strlen (START_BLOCK);
                        ptr += nlen;
                        continue;
                    }

                    sprintf(searchFor, END_BLOCK);
                    ptr = (char *)strstr(ptr, searchFor);

                    if (!ptr) { found = 0; break; }

                    nlen = strlen (END_BLOCK);                  
                    ptr += nlen;

                    if (ptr)
                    {
                        // look ahead to make sure we have more to pull out
                        sprintf(searchFor, END_BLOCK);
                        endTag = (char *)strstr(ptr, searchFor);
                        if (!endTag) { break; }
                    }
                }

                found = 0;
                break;
            }

            // find the section of the downloaded page we care about
            // the next line we read will be a blob containing the html we want
            if (strstr(line, "wiki-content") != NULL)
            {
                found = 1;
            }
        }

        fclose(html);
    }

    return 0;
}

got_code(char *html)
{
    char    code[8];
    char    *endTag;
    struct  _code_st    *currCode;
    int i;  

    endTag = (char *)strstr(html, "</strong>");
    if(!endTag)return;

    sprintf(code, "%.7s", html);

    for(i=0 ; i<Data.Codes ; i++)
        if(strcasecmp(Data.Code[i].Code, code)==0)
            return;

    ADD_TO_LIST(currCode, _code_st, Data.Code, Data.Codes);
    currCode->Code = (char *)strdup(code);

    printf("Code: %s\n", code);
}